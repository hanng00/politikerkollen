#!/usr/bin/env bun
/**
 * CDK App entry point for Politikerkollen infrastructure.
 *
 * Usage:
 *   bunx cdk deploy --all                    # Deploy to dev (default)
 *   bunx cdk deploy --all -c environment=dev # Deploy to dev
 *   bunx cdk diff                            # Preview changes
 *   bunx cdk destroy --all                   # Tear down
 */

import * as cdk from "aws-cdk-lib";

import { type Environment, getConfig } from "./config.js";
import { PolitikerkollenStack } from "./stack.js";

const app = new cdk.App();

// Get environment from context (default: dev)
const environment = (app.node.tryGetContext("environment") ||
  "dev") as Environment;
const config = getConfig(environment);

// Create the stack
new PolitikerkollenStack(app, `Politikerkollen-${config.environment}`, {
  config,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1", // Ireland - better capacity
  },
  description: `Politikerkollen ${config.environment} - Cost-optimized Dagster on AWS`,
  tags: {
    Project: "politikerkollen",
    Environment: config.environment,
    ManagedBy: "cdk",
  },
});

app.synth();
