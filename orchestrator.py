#!/usr/bin/env python3
"""
FHIBE Bias Evaluation Orchestrator
==================================
Hub-and-spoke architecture coordinating all agents.

Features:
- Checkpointing: Saves progress every N images
- Resume: Continue from last checkpoint
- Cost estimation: Shows estimated cost before running
- Rate limiting: Respects API rate limits
- Parallel processing: Configurable concurrency

Usage:
    # Quick test with local Ollama
    python orchestrator.py --quick --vision-provider ollama --vision-model llama3.2-vision

    # Test with Claude API
    python orchestrator.py --quick --vision-provider anthropic --vision-model claude-sonnet-4-20250514

    # Full 100K evaluation with checkpointing
    python orchestrator.py --samples 100000 --vision-provider openai --vision-model gpt-4o

    # Resume from checkpoint
    python orchestrator.py --resume results/checkpoint_20240316_120000.json

    # Estimate cost only
    python orchestrator.py --samples 10000 --estimate-only
"""

import asyncio
import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Literal, List, Optional

from dotenv import load_dotenv
load_dotenv()  # Load .env file

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

from agents import (
    VisionAgent,
    JudgeAgent,
    SamplerAgent,
    AnalyzerAgent,
    ReporterAgent,
    EvaluationResult,
    ATTRIBUTE_GROUND_TRUTH_MAP,
    FHIBE_CSV_PATH,
)
from schemas import VLMEvaluationResponse, JudgeResponse

console = Console()


# ============================================================================
# COST ESTIMATION
# ============================================================================

VLM_COSTS = {
    # Provider: model -> (input_per_1M, output_per_1M)
    "anthropic": {
        "claude-sonnet-4-20250514": (3.0, 15.0),
        "claude-opus-4-5-20251101": (15.0, 75.0),
    },
    "openai": {
        "gpt-4o": (2.5, 10.0),
        "gpt-4o-mini": (0.15, 0.60),
        "gpt-4.1": (2.0, 8.0),
    },
    "google": {
        "gemini-2.0-flash": (0.10, 0.40),
        "gemini-2.5-pro": (1.25, 10.0),
    },
    "ollama": {},  # Free (local)
    "featherless": {
        # Featherless pricing: ~$0.10-0.20 per 1M tokens for most models
        "google/gemma-3-27b-it": (0.20, 0.20),
        "mistralai/Mistral-Small-3.1-24B-Instruct-2503": (0.15, 0.15),
        "Qwen/Qwen2.5-VL-72B-Instruct": (0.30, 0.30),
    },
}

def estimate_cost(n_images: int, provider: str, model: str) -> dict:
    """Estimate cost for evaluation."""
    # ~500 input tokens (image) + ~100 output tokens per image
    INPUT_TOKENS = 500
    OUTPUT_TOKENS = 100

    if provider not in VLM_COSTS or model not in VLM_COSTS.get(provider, {}):
        return {"per_image": 0, "total": 0, "note": "Free (local) or unknown"}

    input_rate, output_rate = VLM_COSTS[provider][model]
    cost_per_image = (input_rate * INPUT_TOKENS / 1_000_000) + (output_rate * OUTPUT_TOKENS / 1_000_000)

    return {
        "per_image": cost_per_image,
        "total": cost_per_image * n_images,
        "input_rate": input_rate,
        "output_rate": output_rate,
    }


def display_cost_table(n_images: int, vision_provider: str, vision_model: str,
                       judge_provider: str, judge_model: str):
    """Display cost estimation table."""
    vision_cost = estimate_cost(n_images, vision_provider, vision_model)
    judge_cost = estimate_cost(n_images, judge_provider, judge_model)

    table = Table(title=f"Cost Estimate for {n_images:,} images")
    table.add_column("Component", style="cyan")
    table.add_column("Model", style="yellow")
    table.add_column("Per Image", style="white")
    table.add_column("Total", style="green")

    table.add_row(
        "Vision",
        f"{vision_provider}:{vision_model}",
        f"${vision_cost['per_image']:.5f}" if vision_cost['per_image'] else "Free",
        f"${vision_cost['total']:.2f}" if vision_cost['total'] else "Free"
    )
    table.add_row(
        "Judge",
        f"{judge_provider}:{judge_model}",
        f"${judge_cost['per_image']:.5f}" if judge_cost['per_image'] else "Free",
        f"${judge_cost['total']:.2f}" if judge_cost['total'] else "Free"
    )

    total = vision_cost['total'] + judge_cost['total']
    table.add_row("", "", "", "")
    table.add_row("[bold]TOTAL[/bold]", "", "", f"[bold]${total:.2f}[/bold]")

    console.print(table)
    return total


# ============================================================================
# CHECKPOINT MANAGEMENT
# ============================================================================

def save_checkpoint(filepath: str, data: dict):
    """Save checkpoint."""
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)
    console.print(f"[dim]Checkpoint saved: {filepath}[/dim]")


def load_checkpoint(filepath: str) -> Optional[dict]:
    """Load checkpoint."""
    if Path(filepath).exists():
        with open(filepath) as f:
            return json.load(f)
    return None


# ============================================================================
# ORCHESTRATOR
# ============================================================================

class BiasEvaluationOrchestrator:
    """
    Main orchestrator - hub of the hub-and-spoke architecture.

    Coordinates:
    - VisionAgent: Queries VLMs with images
    - JudgeAgent: Evaluates predictions (LLM-as-a-Judge)
    - SamplerAgent: Selects balanced samples
    - AnalyzerAgent: Calculates disparity metrics
    - ReporterAgent: Generates reports
    """

    def __init__(
        self,
        sample_file: str,
        vision_provider: Literal["ollama", "anthropic", "openai", "google", "featherless"],
        vision_model: str,
        judge_provider: Literal["ollama", "anthropic", "openai", "google", "featherless"],
        judge_model: str,
        concurrency: int = 5,
        rate_limit: float = 0.5,
    ):
        self.sampler = SamplerAgent(sample_file)
        self.vision = VisionAgent(vision_provider, vision_model)
        self.judge = JudgeAgent(judge_provider, judge_model)
        self.analyzer = AnalyzerAgent()
        self.reporter = ReporterAgent()

        self.vision_provider = vision_provider
        self.vision_model = vision_model
        self.concurrency = concurrency
        self.rate_limit = rate_limit

    async def run(
        self,
        attributes: List[str] = None,
        group_by: str = "skin_group",
        max_samples: Optional[int] = None,
        checkpoint_interval: int = 100,
        resume_from: Optional[str] = None,
    ) -> dict:
        """
        Run the full evaluation pipeline.

        1. Load ALL samples
        2. Vision agent queries VLM for each image
        3. Judge agent evaluates each response
        4. Analyzer calculates bias metrics for ONE grouping
        5. Reporter generates output

        Run separately for each grouping (skin_group, region, age, pronoun).

        Args:
            group_by: Single attribute to analyze by
            max_samples: Limit number of samples (None = all)
            checkpoint_interval: Save checkpoint every N images
            resume_from: Path to checkpoint file to resume from
        """
        attributes = attributes or [
            "age", "action", "gender_presentation", "hair_type", "scene",
            "trustworthiness_score", "skin_tone"
        ]

        # Use ALL samples for maximum statistical power
        samples = self.sampler.get_all()
        if max_samples:
            samples = samples[:max_samples]

        # Resume from checkpoint if provided
        processed_ids = set()
        results: List[tuple[EvaluationResult, JudgeResponse]] = []
        raw_results_data = []

        if resume_from:
            checkpoint = load_checkpoint(resume_from)
            if checkpoint:
                processed_ids = set(checkpoint.get("processed_ids", []))
                raw_results_data = checkpoint.get("raw_results", [])
                console.print(f"[green]Resuming: {len(processed_ids)} already processed[/green]")

        remaining_samples = [s for s in samples if s.image_id not in processed_ids]

        console.print(f"\n[bold blue]FHIBE VLM Bias Evaluation[/bold blue]")
        console.print("=" * 60)
        console.print(f"Vision:     {self.vision_provider}:{self.vision_model}")
        console.print(f"Judge:      {self.judge.provider}:{self.judge.model}")
        console.print(f"Total:      {len(samples)} | Remaining: {len(remaining_samples)}")
        console.print(f"Attributes: {attributes}")
        console.print(f"Group by:   {group_by}")
        console.print("=" * 60)

        # Checkpoint file path
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        checkpoint_file = f"results/checkpoint_{timestamp}.json"

        # Step 1-3: Query VLM and Judge for each sample
        semaphore = asyncio.Semaphore(self.concurrency)
        processed_count = len(processed_ids)

        async def process_sample(sample):
            async with semaphore:
                # Query Vision Agent
                parsed, raw, latency, tokens = await self.vision.evaluate_image(sample.filepath)

                eval_result = EvaluationResult(
                    sample=sample,
                    vlm_name=f"{self.vision_provider}:{self.vision_model}",
                    response=parsed,
                    raw_response=raw,
                    parse_error=None if parsed else "Parse failed",
                    latency_ms=latency,
                    tokens_used=tokens,
                )

                # Prepare for judge
                if parsed:
                    predictions = parsed.model_dump()
                else:
                    predictions = {}

                ground_truth = {
                    attr: sample.ground_truth.get(gt_key)
                    for attr, gt_key in ATTRIBUTE_GROUND_TRUTH_MAP.items()
                    if gt_key
                }

                # Query Judge Agent
                judge_response = await self.judge.judge(predictions, ground_truth, attributes)

                await asyncio.sleep(self.rate_limit)
                return eval_result, judge_response

        # Process all samples with progress bar and checkpointing
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console
        ) as progress:
            task = progress.add_task(f"Evaluating...", total=len(remaining_samples))

            tasks = [process_sample(s) for s in remaining_samples]
            for i, coro in enumerate(asyncio.as_completed(tasks)):
                eval_result, judge_response = await coro
                results.append((eval_result, judge_response))
                processed_ids.add(eval_result.sample.image_id)
                processed_count += 1

                # Store raw result for checkpoint
                raw_results_data.append({
                    "image_id": eval_result.sample.image_id,
                    "skin_group": eval_result.sample.skin_group,
                    "response": eval_result.response.model_dump() if eval_result.response else None,
                    "latency_ms": eval_result.latency_ms,
                    "judgements": [j.model_dump() for j in judge_response.judgements],
                })

                progress.update(task, advance=1)

                # Checkpoint every N images
                if processed_count % checkpoint_interval == 0:
                    save_checkpoint(checkpoint_file, {
                        "timestamp": datetime.now().isoformat(),
                        "processed_ids": list(processed_ids),
                        "total_samples": len(samples),
                        "raw_results": raw_results_data,
                        "config": {
                            "vision": f"{self.vision_provider}:{self.vision_model}",
                            "judge": f"{self.judge.provider}:{self.judge.model}",
                        }
                    })

        # Step 4: Analyze for bias (single grouping - controlled experiment)
        console.print("\n[yellow]Analyzing results...[/yellow]")
        all_metrics = []

        console.print(f"\n[cyan]═══ BALANCED EXPERIMENT: {group_by.upper()} ═══[/cyan]")

        # KEY BIAS ANALYSIS: Trustworthiness and Profession
        bias_analysis = self.analyzer.analyze_bias(results, group_by)

        # Display trustworthiness bias (KEY METRIC)
        trust = bias_analysis["trustworthiness"]
        console.print(f"\n[bold]TRUSTWORTHINESS SCORES (1-10):[/bold]")

        # Sort by mean score to show disparity clearly
        sorted_groups = sorted(trust["group_stats"].items(), key=lambda x: x[1]["mean"], reverse=True)
        for group_name, stats in sorted_groups:
            bar = "█" * int(stats["mean"]) + "░" * (10 - int(stats["mean"]))
            console.print(f"  {group_name:15} [{bar}] mean={stats['mean']:.2f} ± {stats['std']:.2f} (n={stats['n']})")

        status = "[red]BIAS DETECTED[/red]" if trust["is_significant"] else "[green]No significant bias[/green]"
        console.print(f"\n  Disparity: {trust['max_disparity']:.2f} points | Cohen's d: {trust['cohens_d']:.2f} | p={trust['p_value']:.4f}")
        console.print(f"  {status}: {trust['interpretation']}")

        # Display profession bias
        prof = bias_analysis["professions"]
        console.print(f"\n[bold]PROFESSION ASSIGNMENTS:[/bold]")
        for group_name, stats in prof["group_stats"].items():
            console.print(f"  {group_name:15} High prestige: {stats['high_prestige_pct']:.1%} | Low prestige: {stats['low_prestige_pct']:.1%}")
            if stats["examples"]:
                console.print(f"                  Examples: {', '.join(stats['examples'][:3])}")

        console.print(f"\n  High prestige disparity: {prof['high_prestige_disparity']:.1%}")
        console.print(f"  Low prestige disparity: {prof['low_prestige_disparity']:.1%}")

        # Accuracy analysis
        console.print(f"\n[bold]ACCURACY BY ATTRIBUTE:[/bold]")
        for attr in attributes:
            metrics = self.analyzer.analyze(results, attr, group_by)
            all_metrics.append(metrics)

            status = "[red]BIAS[/red]" if metrics.is_significant else "[green]OK[/green]"
            console.print(f"  {attr:25} | Disparity: {metrics.max_disparity:6.1%} | p={metrics.p_value:.3f} | {status}")

        # Step 5: Generate report
        console.print("\n" + self.reporter.text_report(all_metrics))
        console.print("\n" + self.reporter.bias_report([bias_analysis]))

        # Summary
        summary = {
            "group_by": group_by,
            "samples_per_group": bias_analysis["groups"],
            "total_samples": len(results),
            "accuracy_metrics": {
                "total": len(all_metrics),
                "significant": sum(1 for m in all_metrics if m.is_significant),
                "avg_disparity": sum(m.max_disparity for m in all_metrics) / len(all_metrics) if all_metrics else 0,
                "biased_attrs": [m.attribute for m in all_metrics if m.is_significant],
            },
            "trustworthiness_bias": trust["is_significant"],
            "trustworthiness_cohens_d": trust["cohens_d"],
            "trustworthiness_p_value": trust["p_value"],
        }

        console.print(f"\n[bold]═══════════════════════════════════════════════════════════[/bold]")
        console.print(f"[bold]FINAL SUMMARY - Grouped by: {group_by.upper()}[/bold]")
        console.print(f"[bold]═══════════════════════════════════════════════════════════[/bold]")

        console.print(f"\n[cyan]Samples per group:[/cyan]")
        for g, n in bias_analysis["groups"].items():
            console.print(f"  {g}: {n}")

        console.print(f"\n[cyan]Accuracy-based analysis:[/cyan]")
        console.print(f"  Significant biases: {summary['accuracy_metrics']['significant']}/{summary['accuracy_metrics']['total']}")
        console.print(f"  Average disparity:  {summary['accuracy_metrics']['avg_disparity']:.1%}")
        if summary['accuracy_metrics']['biased_attrs']:
            console.print(f"  [red]Biased attributes: {summary['accuracy_metrics']['biased_attrs']}[/red]")

        console.print(f"\n[cyan]Subjective bias (KEY METRIC):[/cyan]")
        if trust["is_significant"]:
            console.print(f"  [red]⚠️  TRUSTWORTHINESS BIAS DETECTED[/red]")
            console.print(f"  [red]    Cohen's d = {trust['cohens_d']:.2f}, p = {trust['p_value']:.4f}[/red]")
            console.print(f"  [red]    {trust['interpretation']}[/red]")
        else:
            console.print(f"  [green]✓  No significant trustworthiness bias[/green]")

        return {
            "config": {
                "vision": f"{self.vision_provider}:{self.vision_model}",
                "judge": f"{self.judge.provider}:{self.judge.model}",
                "total_samples": len(results),
                "samples_per_group": bias_analysis["groups"],
                "attributes": attributes,
                "group_by": group_by,
            },
            "metrics": self.reporter.json_report(all_metrics),
            "bias_analysis": {
                "group_by": bias_analysis["group_by"],
                "n_samples": bias_analysis["n_samples"],
                "groups": bias_analysis["groups"],
                "trustworthiness": bias_analysis["trustworthiness"],
                "professions": bias_analysis["professions"],
            },
            "summary": summary,
            "raw_results": [
                {
                    "image_id": r.sample.image_id,
                    "skin_group": r.sample.skin_group,
                    "region": r.sample.region,
                    "age": r.sample.age,
                    "pronoun": r.sample.pronoun,
                    "response": r.response.model_dump() if r.response else None,
                    "latency_ms": r.latency_ms,
                }
                for r, _ in results
            ]
        }

    def _get_group_value(self, sample, group_by: str) -> str:
        """Helper to get group value for a sample."""
        if group_by == "skin_group":
            return sample.skin_group
        elif group_by == "region":
            return sample.region
        elif group_by == "age":
            age = sample.age
            if age < 25:
                return "young (<25)"
            elif age < 45:
                return "adult (25-44)"
            elif age < 65:
                return "middle (45-64)"
            else:
                return "senior (65+)"
        elif group_by == "pronoun":
            return sample.pronoun
        return "unknown"


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="FHIBE Bias Evaluation - Balanced Controlled Experiments",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Quick test (4 per group) - skin color grouping
    python orchestrator.py --quick --group-by skin_group

    # Full evaluation (100 per group) - skin color
    python orchestrator.py --full --group-by skin_group --vision-provider featherless

    # Test by region with 50 samples per group
    python orchestrator.py --group-by region --n-per-group 50

    # Test by age groups
    python orchestrator.py --group-by age --n-per-group 100

    # Test by gender
    python orchestrator.py --group-by pronoun --n-per-group 100

    # Resume from checkpoint
    python orchestrator.py --resume results/checkpoint_20240316.json

    # Estimate cost only
    python orchestrator.py --n-per-group 100 --estimate-only --vision-provider openai --vision-model gpt-4o

Run separately for each grouping to get controlled experiments!
        """
    )

    parser.add_argument("--quick", action="store_true", help="Quick test (20 samples)")
    parser.add_argument("--full", action="store_true", help="Full dataset (~10K samples)")
    parser.add_argument("--samples", type=int, help="Limit number of samples")

    parser.add_argument("--vision-provider", type=str, default="ollama",
                       choices=["ollama", "anthropic", "openai", "google", "featherless"])
    parser.add_argument("--vision-model", type=str, default="llama3.2-vision")

    parser.add_argument("--judge-provider", type=str, default="ollama",
                       choices=["ollama", "anthropic", "openai", "google", "featherless"])
    parser.add_argument("--judge-model", type=str, default="llama3.2")

    parser.add_argument("--group-by", type=str, default="skin_group",
                       choices=["skin_group", "region", "age", "pronoun"],
                       help="Attribute to group by (run separately for each)")
    parser.add_argument("--concurrency", type=int, default=4, help="Max concurrent requests (Featherless allows 4)")
    parser.add_argument("--rate-limit", type=float, default=0.5, help="Delay between requests (seconds)")
    parser.add_argument("--checkpoint-interval", type=int, default=100, help="Save checkpoint every N images")

    parser.add_argument("--resume", type=str, help="Resume from checkpoint file")
    parser.add_argument("--estimate-only", action="store_true", help="Only show cost estimate")
    parser.add_argument("--sample-file", type=str, default=None,
                       help="Sample file (JSON or CSV). Defaults to full FHIBE CSV.")
    parser.add_argument("--output", type=str, help="Output JSON file")

    args = parser.parse_args()

    # Determine max samples
    if args.quick:
        max_samples = 20
    elif args.full:
        max_samples = None  # All samples
    elif args.samples:
        max_samples = args.samples
    else:
        max_samples = 100  # Default

    # Determine sample file - default to the path set in agents.py
    if args.sample_file:
        sample_file = Path(args.sample_file)
        if not sample_file.exists():
            sample_file = Path(__file__).parent / args.sample_file
    else:
        sample_file = Path(FHIBE_CSV_PATH)

    if not sample_file.exists():
        console.print(f"[red]Sample file not found: {sample_file}[/red]")
        console.print(f"[dim]Try setting FHIBE_DATASET_ROOT or FHIBE_DATASET_CSV environment variables.[/dim]")
        return

    # Load sample count from file
    if sample_file.suffix == '.csv':
        import pandas as pd
        df = pd.read_csv(sample_file)
        total_in_file = len(df)
    else:
        with open(sample_file) as f:
            data = json.load(f)
        total_in_file = len(data.get("samples", []))

    n_samples = min(max_samples, total_in_file) if max_samples else total_in_file

    # Show cost estimate
    console.print(f"\n[bold]Configuration[/bold]")
    console.print(f"  Group by: {args.group_by}")
    console.print(f"  Samples: {n_samples:,} (of {total_in_file:,} available)")
    total_cost = display_cost_table(
        n_samples, args.vision_provider, args.vision_model,
        args.judge_provider, args.judge_model
    )

    if args.estimate_only:
        return

    if total_cost > 10:
        console.print(f"\n[yellow]Estimated cost: ${total_cost:.2f}[/yellow]")
        confirm = input("Continue? [y/N]: ")
        if confirm.lower() != 'y':
            console.print("[red]Aborted.[/red]")
            return

    # Run orchestrator
    orchestrator = BiasEvaluationOrchestrator(
        sample_file=str(sample_file),
        vision_provider=args.vision_provider,
        vision_model=args.vision_model,
        judge_provider=args.judge_provider,
        judge_model=args.judge_model,
        concurrency=args.concurrency,
        rate_limit=args.rate_limit,
    )

    results = asyncio.run(orchestrator.run(
        group_by=args.group_by,
        max_samples=max_samples,
        checkpoint_interval=args.checkpoint_interval,
        resume_from=args.resume,
    ))

    # Save results
    if args.output:
        output_file = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        Path("results").mkdir(exist_ok=True)
        output_file = f"results/eval_{timestamp}.json"

    with open(output_file, "w") as f:
        json.dump(results, f, indent=2, default=str)

    console.print(f"\n[green]Results saved to: {output_file}[/green]")


if __name__ == "__main__":
    main()
