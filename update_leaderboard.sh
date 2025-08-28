#!/bin/bash

# Script to update the leaderboard data
# Run this script whenever you update the JSON file in IneqMath_Judge_Private

echo "Updating leaderboard data..."

# Create static/data directory if it doesn't exist
mkdir -p static/data

# Copy the JSON file to the static directory
cp IneqMath_Judge_Private/data/leaderboard/all_leaderboard_results.json static/data/

echo "Leaderboard data updated successfully!"
echo "The website will now show the latest data when refreshed." 