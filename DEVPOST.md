# pixelPrejudice

## Inspiration

We kept seeing headlines about AI bias, but most of the research focused on text models. Then we asked ourselves a simple question: what happens when you show the same photo to five different vision AI models and ask "how trustworthy does this person look?" The answers were... uncomfortable. A construction worker from Kenya got rated a 4. A tech bro from Europe got an 8. Same smile, same pose, wildly different scores. That's when we knew we had to dig deeper!

## What it does

pixelPrejudice evaluates Vision Language Models for demographic bias using the FHIBE dataset, a collection of around 10,000 real human images with rich demographic metadata including skin tone, ancestry, age, gender, and nationality. We send each image to VLMs and ask them to estimate things like age, nationality, and what activity the person is doing (stuff we can verify against ground truth) alongside subjective judgments like trustworthiness score, intelligence score, attractiveness score, profession guess, and perceived socioeconomic class (stuff with no ground truth, which is where bias shows up). We then group the results by skin tone, region, age, and gender to see if the models rate certain groups systematically higher or lower. So far we've tested Qwen2.5-VL-7B, Microsoft Phi-3.5-Vision, and Qwen3-VL-30B-A3B to compare how models from different labs and sizes behave differently.

## How we built it

We designed a hub-and-spoke architecture with a central orchestrator coordinating five specialized tools:

- **Vision Tool** queries VLMs and extracts structured responses from images
- **Judge Tool** compares predictions against ground truth using LLM-as-a-Judge
- **Sampler Tool** handles balanced sampling across demographic groups
- **Analyzer Tool** runs statistical tests including T-tests, correlations, and p-values
- **Reporter Tool** generates bias reports with metrics and visualizations

We used the FHIBE dataset which contains diverse human images with detailed demographic labels. We rented an H100 80GB GPU on Vast.ai and used vLLM to serve the vision models. We built a Python pipeline using async requests with httpx that processes images concurrently. For consistent outputs, we used Pydantic schemas with vLLM's structured output feature (response_format with json_schema). The pipeline runs at about 2-3 images per second and saves checkpoints every 100 images so we don't lose progress if something crashes.

Built with Python, vLLM, Pydantic, httpx, pandas, and rich for progress tracking.

## Challenges we ran into

Our first evaluation run had a 0% success rate. The models were returning free text paragraphs instead of JSON because we were using a deprecated vLLM parameter (guided_json instead of response_format). Took a while to figure that out.

GPU memory was tricky. The Qwen3-VL-30B model uses 58GB just for weights, leaving limited space for KV cache. We had to reduce the max context length to make it fit on a single H100.

We also ran into zombie GPU memory on Vast.ai where nvidia-smi showed 86GB used with no processes running. Had to destroy and recreate the instance.

Getting files onto the GPU server was annoying since SCP kept failing. Ended up using pixeldrain with API authentication to transfer result files.

## Accomplishments that we're proud of

We successfully ran three different VLMs from two different labs (Alibaba and Microsoft) on the full 10,000 image dataset. We built a reproducible pipeline with structured outputs that anyone can use to audit vision models. We collected subjective bias indicators (trustworthiness, intelligence, attractiveness) that most benchmarks ignore because they're uncomfortable to talk about.

## What we learned

Different models have different response patterns even with the same structured output schema. The newer MoE models (like Qwen3-VL-30B-A3B) are surprisingly fast because they only activate a fraction of parameters per token. Structured output in vLLM requires specific API formatting that changed between versions and bias evaluation is harder than accuracy evaluation because there's no "correct" answer for how trustworthy someone looks.

## What's next for pixelPrejudice

Run the analysis scripts to quantify the actual bias patterns across models and demographics. Test more models from different regions and labs (cloud ones) to see how training data origin affects bias and also make the results accessible so others can see exactly how these models judge people differently based on appearance.

Longer term, we want to turn this into a bias auditing service for AI labs and enterprises. Companies deploying vision models in hiring, content moderation, or security need to know if their models discriminate before they ship. We'd offer standardized bias reports showing how models perform across demographic groups, complete with statistical significance testing and fairness scores. Labs could test their models before release, enterprises could audit third-party models before deployment. The pipeline is already built and reproducible, now it's about scaling it into a service that makes AI accountability accessible to everyone.
