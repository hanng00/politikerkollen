"""CloudFormation custom resource: default VPC ID and all subnet IDs (comma-separated)."""

import json
import logging
import urllib.request

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2 = boto3.client("ec2")


def _cfn_response(
    event: dict,
    context,
    status: str,
    reason: str,
    physical_resource_id: str,
    data: dict | None = None,
) -> None:
    body = json.dumps(
        {
            "Status": status,
            "Reason": (reason or "n/a")[:4096],
            "PhysicalResourceId": physical_resource_id,
            "StackId": event["StackId"],
            "RequestId": event["RequestId"],
            "LogicalResourceId": event["LogicalResourceId"],
            "Data": data or {},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        event["ResponseURL"],
        data=body,
        method="PUT",
        headers={
            "Content-Type": "",
            "Content-Length": str(len(body)),
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        logger.info("cfn response status=%s", resp.status)


def handler(event: dict, context) -> None:
    request_type = event["RequestType"]
    physical_id = event.get("PhysicalResourceId") or context.log_stream_name

    if request_type == "Delete":
        _cfn_response(event, context, "SUCCESS", "delete", physical_id, {})
        return

    try:
        vpcs = ec2.describe_vpcs(
            Filters=[{"Name": "isDefault", "Values": ["true"]}]
        )["Vpcs"]
        if not vpcs:
            _cfn_response(
                event,
                context,
                "FAILED",
                "No default VPC in this account/region. Create or restore a default VPC.",
                physical_id,
                {},
            )
            return

        vpc_id = vpcs[0]["VpcId"]
        physical_id = vpc_id

        subnets = ec2.describe_subnets(
            Filters=[{"Name": "vpc-id", "Values": [vpc_id]}]
        )["Subnets"]
        if not subnets:
            _cfn_response(
                event,
                context,
                "FAILED",
                f"No subnets in default VPC {vpc_id}",
                physical_id,
                {},
            )
            return

        subnet_csv = ",".join(sorted(s["SubnetId"] for s in subnets))
        _cfn_response(
            event,
            context,
            "SUCCESS",
            "ok",
            physical_id,
            {"VpcId": vpc_id, "SubnetIds": subnet_csv},
        )
    except Exception:
        logger.exception("default vpc lookup failed")
        _cfn_response(
            event,
            context,
            "FAILED",
            str(exc),
            physical_id,
            {},
        )
