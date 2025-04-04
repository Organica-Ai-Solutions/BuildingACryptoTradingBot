#!/bin/bash

# Exit on error
set -e

cd "$(dirname "$0")"
BOOK_DIR="$(pwd)"

echo "Building EPUB in directory: $BOOK_DIR"

# Install required dependencies if not already present
if ! command -v markdown-pp &> /dev/null; then
    echo "Installing markdown-pp..."
    pip install MarkdownPP
fi

# Ensure each chapter file ends with a newline
echo "Ensuring all chapter files end with newlines..."
for file in manuscript/*.md; do
    if [ -f "$file" ]; then
        # Check if file doesn't end with newline
        if [ "$(tail -c 1 "$file" | wc -l)" -eq 0 ]; then
            echo "" >> "$file"
            echo "Added newline to $file"
        fi
    fi
done

# Process the manuscript with MarkdownPP
echo "Processing Markdown files with MarkdownPP..."
if [ -f "$BOOK_DIR/processed_manuscript.md" ]; then
    rm "$BOOK_DIR/processed_manuscript.md"
fi

markdown-pp manuscript.md -o processed_manuscript.md

# Convert to EPUB using Pandoc
echo "Converting to EPUB with Pandoc..."
pandoc -o "CryptoTradingBot.epub" \
    "$BOOK_DIR/metadata.yaml" \
    "$BOOK_DIR/processed_manuscript.md" \
    --toc \
    --toc-depth=2 \
    --css="$BOOK_DIR/stylesheet.css" \
    --epub-cover-image="$BOOK_DIR/images/bookcovernew.png" \
    --metadata=lang:en-US

# Check if the output file exists
if [ -f "CryptoTradingBot.epub" ]; then
    echo "Success! EPUB file created: $(pwd)/CryptoTradingBot.epub"
    echo "You can now upload this file to KDP."
else
    echo "Error: EPUB file was not created."
    exit 1
fi

# Generate a validation report if epubcheck is installed
if command -v epubcheck &> /dev/null; then
    echo "Validating EPUB..."
    epubcheck "CryptoTradingBot.epub"
else
    echo "Note: Install epubcheck for EPUB validation before uploading to KDP."
    echo "See: https://github.com/w3c/epubcheck"
fi 