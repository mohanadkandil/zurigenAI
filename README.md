# pixelPrejudice

**What does AI assume when it sees your face?**

We ran 10,000 diverse human photos through multiple Vision Language Models and asked them to rate trustworthiness, intelligence, and attractiveness. The results reveal systematic biases across skin tones, regions, and genders.

## Quick Start

```bash
# Install dependencies
pip install pandas pydantic rich httpx pillow

# Start vLLM server (requires GPU)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8001 --gpu-memory-utilization 0.9

# Run evaluation
python run_vlm.py --model Qwen/Qwen2.5-VL-7B-Instruct --vllm-url http://localhost:8001

# Quick test (20 samples)
python run_vlm.py --quick

# Analyze results
python analyze_results.py results/vlm_*.json --group-by all
```

## What We Measure

### Verifiable (Ground Truth Available)

| Field       | Description                        |
| ----------- | ---------------------------------- |
| age         | Estimated age in years             |
| nationality | Guessed nationality                |
| skin_tone   | Light, medium, or dark             |
| hair_type   | Straight, curly, wavy, coily, bald |
| scene       | Indoor or outdoor                  |
| activity    | What the person is doing           |

### Bias Indicators (No Ground Truth)

| Field                 | Description                  |
| --------------------- | ---------------------------- |
| trustworthiness_score | 1-10 scale                   |
| intelligence_score    | 1-10 scale                   |
| attractiveness_score  | 1-10 scale                   |
| profession_guess      | What job AI thinks they have |
| socioeconomic_class   | Lower, middle, or upper      |

## Models Tested

| Model                     | Lab       | Parameters            |
| ------------------------- | --------- | --------------------- |
| Qwen2.5-VL-7B-Instruct    | Alibaba   | 7B                    |
| Phi-3.5-vision-instruct   | Microsoft | 4.2B                  |
| Qwen3-VL-30B-A3B-Instruct | Alibaba   | 30B MoE (2.4B active) |

## Dataset

We use the [FHIBE dataset](https://huggingface.co/datasets/sony/fhibe) containing ~10,000 diverse human images with demographic metadata:

- Skin tone (Fitzpatrick scale)
- Ancestry/Region
- Age
- Gender/Pronouns
- Nationality

## Project Structure

```
pixelPrejudice/
├── run_vlm.py          # Main evaluation script
├── analyze_results.py  # Bias analysis script
├── results/            # JSON output files
│   └── vlm_*.json
├── DEVPOST.md          # Hackathon submission
└── README.md
```

## Requirements

- Python 3.10+
- GPU with 24GB+ VRAM (or use cloud GPU)
- vLLM 0.12+

## Architecture

We use a hub-and-spoke agent architecture with a central orchestrator coordinating specialized agents:

![Pipeline Architecture](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/004/469/001/datas/small.png)

- **Vision Agent** queries VLMs and extracts structured responses from images
- **Judge Agent** compares predictions against ground truth using LLM-as-a-Judge
- **Sampler Tool** handles balanced sampling across demographic groups
- **Analyzer Tool** runs statistical tests including T-tests, correlations, and p-values
- **Reporter Agent** generates bias reports with metrics and visualizations

## Key Findings

_Analysis in progress..._

## Built With

- [vLLM](https://github.com/vllm-project/vllm) - Fast LLM inference
- [FHIBE](https://huggingface.co/datasets/sony/fhibe) - Fair Human Image Bias Evaluation dataset
- [Pydantic](https://docs.pydantic.dev/) - Structured output validation
- [Vast.ai](https://vast.ai/) - GPU cloud (H100 80GB)

## License

MIT

## Acknowledgments

Built for the Zurich GenAI Hackathon 2026 - SonyAI track.
