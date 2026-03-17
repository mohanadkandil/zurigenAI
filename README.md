# FHIBE Bias Evaluation System

A comprehensive, agent-based evaluation system for Vision-Language Models (VLMs) using the **FHIBE (Fairness in Human-Image Bias Evaluation)** dataset.

## Features

- **Hub-and-Spoke Agent Architecture**: Coordinates Vision, Judge, Sampler, Analyzer, and Reporter agents.
- **VLM Support**: Interfaces with Ollama (local), Anthropic, OpenAI, Google Gemini, and Featherless AI.
- **Structured Evaluation**: Uses Pydantic schemas for consistent data extraction and LLM-as-a-Judge evaluation.
- **Bias Analysis**: Focuses on both objective accuracy disparities and subjective bias indicators (Trustworthiness and Profession assignments).
- **Engineering-First Design**: Includes checkpointing, resume capabilities, cost estimation, and rate limiting.

## Setup

### 1. Environment

This project uses `uv` for dependency management. To set up the environment:

```bash
uv pip install -r requirements.txt
```

Or using pip:

```bash
pip install -r requirements.txt
```

Create a `.env` file with your API keys:

```env
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key
FEATHERLESS_API_KEY=your_key
```

### 2. Dataset Setup

The FHIBE dataset is required for evaluation (~192GB). You can download and extract it using the provided script:

```bash
chmod +x setup_dataset.sh
./setup_dataset.sh
```

The script uses the following command to download the dataset:

```bash
curl -L -X GET 'https://fairnessbenchmark.ai.sony/api/fhibe/get-dataset-download-redirect?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJidWNrZXQiOiJzYWktZXRoaWNzLWVoY2lkLWZoaWJlLXRpYyIsImtleSI6ImZoaWJlLjIwMjUwNzE2LnUuZ1Q1X3JGVEFfZG93bnNhbXBsZWRfcHVibGljLnRhci5neiIsInVzZXIiOiJ0aGVhcmthbWl0cmFAZ21haWwuY29tIiwic2x1ZyI6Ii9kb3dubG9hZCIsImlhdCI6MTc3MzQ4MTYyNiwiZXhwIjoxNzczNTY4MDI2fQ.2LUmB-t6PdDzrC2DO8_GR6gBMPhdqAcNM9-jzV-KMSE' -o 'fhibe.20250716.u.gT5_rFTA_downsampled_public.tar.gz'
```

And extracts it with:

```bash
tar -xzf fhibe.20250716.u.gT5_rFTA_downsampled_public.tar.gz
```

### 3. Configuration

You can configure the dataset path using environment variables if you prefer to store it elsewhere:

- `FHIBE_DATASET_ROOT`: Root directory of the extracted dataset.
- `FHIBE_DATASET_CSV`: Path to the main CSV metadata file.

## Usage

The `orchestrator.py` is the main entry point for running evaluations.

### Quick Test

Run a quick test with a local Ollama model:

```bash
python orchestrator.py --quick --vision-provider ollama --vision-model llama3.2-vision
```

### Full Evaluation

Run a full evaluation on a specific grouping (e.g., skin color):

```bash
python orchestrator.py --full --group-by skin_group --vision-provider openai --vision-model gpt-4o
```

### Other Groupings

You can analyze bias by different demographic attributes:

```bash
python orchestrator.py --group-by region
python orchestrator.py --group-by age
python orchestrator.py --group-by pronoun
```

### Resume from Checkpoint

If an evaluation is interrupted, you can resume from the last checkpoint:

```bash
python orchestrator.py --resume results/checkpoint_YYYYMMDD_HHMMSS.json
```

## Architecture

- **VisionAgent**: Queries VLMs and parses structured responses.
- **JudgeAgent**: Compares VLM predictions against ground truth using an LLM-as-a-Judge approach.
- **SamplerAgent**: Handles balanced and stratified sampling from the dataset.
- **AnalyzerAgent**: Performs statistical tests (ANOVA, T-tests) to detect bias.
- **ReporterAgent**: Generates human-readable and machine-readable reports.
