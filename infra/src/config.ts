/**
 * Infra tuning — one account = one deployment; no dev/prod naming tier.
 */

import * as ec2 from "aws-cdk-lib/aws-ec2";

/** EC2 instance class for optional Dagster stack only. */
export const DAGSTER_EC2_INSTANCE_SIZE = ec2.InstanceSize.SMALL;
