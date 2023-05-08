import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface SpokeVpcProps {
  vpcCidr: string;
}

export class SpokeVpc extends Construct {
  readonly vpc: cdk.aws_ec2.IVpc;

  constructor(scope: Construct, id: string, props: SpokeVpcProps) {
    super(scope, id);

    this.vpc = new cdk.aws_ec2.Vpc(this, "Default", {
      ipAddresses: cdk.aws_ec2.IpAddresses.cidr(props?.vpcCidr),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "Egress",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28,
        },
        {
          name: "Tgw",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 27,
        },
      ],
    });
  }
}
