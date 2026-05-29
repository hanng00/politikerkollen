#!/usr/bin/env bun
/**
 * CDK App — Politikerkollen infrastructure.
 *
 * Account and region come from the AWS CLI only (`--profile`, `AWS_PROFILE`, …).
 *
 * **Core stack (always):** VPC, ECR (`politikerkollen/ingestion|dbt|cognition`), MotherDuck secret.
 * **Dagster stack (optional):** `-c deployDagster=true`
 */

import * as cdk from "aws-cdk-lib";

import { PolitikerkollenCoreStack } from "./core-stack.js";
import { PolitikerkollenDagsterStack } from "./dagster-stack.js";

const app = new cdk.App();

const tags = {
  Project: "politikerkollen",
  ManagedBy: "cdk",
};

const core = new PolitikerkollenCoreStack(app, "Politikerkollen-Core", {
  description: "Politikerkollen — core (VPC, ECR, secrets)",
  tags,
});

const deployDagster = app.node.tryGetContext("deployDagster") === "true";

if (deployDagster) {
  new PolitikerkollenDagsterStack(app, "Politikerkollen-Dagster", {
    core,
    description: "Politikerkollen — optional Dagster on EC2",
    tags,
  });
}

app.synth();
