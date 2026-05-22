# Arc Task Verifier Bot - Agent Configuration

## Overview
This document outlines the agent configuration for the Arc Task Verifier Bot, an Arc-native tool that evaluates project submissions for technical soundness, reproducibility, and Arc ecosystem alignment.

## Agent Roles

### 1. GitHub Fetcher Agent
- **Purpose**: Extract repository contents for analysis
- **Responsibilities**:
  - Fetch README.md content
  - Retrieve repository structure
  - Parse package.json/requirements.txt
  - Handle GitHub API authentication
- **Triggers**: GitHub repository URL input

### 2. LLM Evaluator Agent
- **Purpose**: Core evaluation engine using OpenAI API
- **Responsibilities**:
  - Process project content through Arc-specific evaluation prompt
  - Generate structured JSON output with scores and feedback
  - Validate output format and content
- **Triggers**: Content received from GitHub Fetcher or text input

### 3. Scoring Engine Agent
- **Purpose**: Calculate signal scores and Arc readiness metrics
- **Responsibilities**:
  - Apply scoring logic to evaluation results
  - Combine base signal score with Arc bonus score
  - Generate category classification
- **Triggers**: JSON evaluation results from LLM Evaluator

### 4. Upgrade Path Generator Agent
- **Purpose**: Provide actionable recommendations for Arc compatibility
- **Responsibilities**:
  - Analyze missing Arc-specific components
  - Generate step-by-step upgrade instructions
  - Suggest integration with App Kit and Foundry
- **Triggers**: Request for upgrade path enhancement

## Agent Communication Flow
1. User submits GitHub URL or text description
2. GitHub Fetcher Agent (if applicable) retrieves repository data
3. LLM Evaluator Agent processes content with Arc evaluation prompt
4. Scoring Engine Agent calculates composite scores
5. Results displayed to user with optional upgrade path enhancement