#!/bin/bash

# This script helps set up environment variables on Heroku securely
# without exposing them in your bash history

echo "This script will help you set up your environment variables on Heroku securely."
echo "Make sure you are already logged in to Heroku CLI."
echo ""

# Get Heroku app name
read -p "Enter your Heroku app name: " app_name

if [ -z "$app_name" ]; then
  echo "Error: App name cannot be empty"
  exit 1
fi

# StatusPage API Key
read -sp "Enter your StatusPage API Key (input will be hidden): " api_key
echo ""

if [ -z "$api_key" ]; then
  echo "Error: API Key cannot be empty"
  exit 1
fi

# StatusPage Page ID
read -p "Enter your StatusPage Page ID: " page_id

if [ -z "$page_id" ]; then
  echo "Error: Page ID cannot be empty"
  exit 1
fi

echo ""
echo "Setting environment variables on Heroku app: $app_name"
heroku config:set STATUSPAGE_API_KEY="$api_key" STATUSPAGE_PAGE_ID="$page_id" --app $app_name

echo ""
echo "Environment variables set successfully!"
echo "You can verify them by running: heroku config --app $app_name" 