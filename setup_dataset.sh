#!/bin/bash

# Setup script for FHIBE Dataset
# This script downloads and extracts the dataset required for bias evaluation.

set -e

DATASET_FILENAME="fhibe.20250716.u.gT5_rFTA_downsampled_public.tar.gz"
EXTRACT_DIR="data"
DOWNLOAD_URL="https://fairnessbenchmark.ai.sony/api/fhibe/get-dataset-download-redirect?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJidWNrZXQiOiJzYWktZXRoaWNzLWVoY2lkLWZoaWJlLXRpYyIsImtleSI6ImZoaWJlLjIwMjUwNzE2LnUuZ1Q1X3JGVEFfZG93bnNhbXBsZWRfcHVibGljLnRhci5neiIsInVzZXIiOiJ0aGVhcmthbWl0cmFAZ21haWwuY29tIiwic2x1ZyI6Ii9kb3dubG9hZCIsImlhdCI6MTc3MzQ4MTYyNiwiZXhwIjoxNzczNTY4MDI2fQ.2LUmB-t6PdDzrC2DO8_GR6gBMPhdqAcNM9-jzV-KMSE"

echo "Step 1: Downloading dataset (approx 192GB)..."
if [ ! -f "$DATASET_FILENAME" ]; then
    curl -L -X GET "$DOWNLOAD_URL" -o "$DATASET_FILENAME"
else
    echo "Dataset archive already exists, skipping download."
fi

echo "Step 2: Extracting dataset..."
# Create data directory if it doesn't exist
mkdir -p "$EXTRACT_DIR"

# Extracting to the current directory (default behavior of the tarball)
# The user already started this, but this script serves as a reference and for future setups.
tar -xzf "$DATASET_FILENAME"

echo "Dataset setup complete."
