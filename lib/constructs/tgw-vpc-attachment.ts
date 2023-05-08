import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface TgwVpcAttachmentProps {
  vpc: cdk.aws_ec2.IVpc;
  tgwId: string;
  isInspectionVpc: boolean;
}

export class TgwVpcAttachment extends Construct {
  readonly tgwVpcAttachmentId: string;

  constructor(scope: Construct, id: string, props: TgwVpcAttachmentProps) {
    super(scope, id);

    // Transit Gateway attachment Subnets
    const tgwSubnetIds = props.vpc.selectSubnets({
      subnetGroupName: "Tgw",
    }).subnetIds;

    // Transit Gateway attachment
    const tgwVpcAttachment = new cdk.aws_ec2.CfnTransitGatewayVpcAttachment(
      this,
      "Default",
      {
        subnetIds: tgwSubnetIds,
        transitGatewayId: props.tgwId,
        vpcId: props.vpc.vpcId,
        options: {
          DnsSupport: "enable",
        },
      }
    );

    this.tgwVpcAttachmentId = tgwVpcAttachment.ref;

    // Route to Transit Gateway
    // To Class A Private IP address
    [...props.vpc.privateSubnets, ...props.vpc.isolatedSubnets].forEach(
      (subnet, index) => {
        // Route tables for subnets with Transit Gateway attachments are not changed
        if (tgwSubnetIds.includes(subnet.subnetId)) {
          return;
        }

        new cdk.aws_ec2.CfnRoute(
          this,
          `Route Table ${index} Route To Tgw For Class A Private IP Address `,
          {
            routeTableId: subnet.routeTable.routeTableId,
            destinationCidrBlock: "10.0.0.0/8",
            transitGatewayId: props.tgwId,
          }
        ).addDependency(tgwVpcAttachment);
      }
    );

    // To Default route
    if (props.isInspectionVpc) {
      return;
    }
    props.vpc
      .selectSubnets({
        subnetGroupName: "Egress",
      })
      .subnets.forEach((subnet, index) => {
        new cdk.aws_ec2.CfnRoute(
          this,
          `Route Table ${index} Route To Tgw For Default Route`,
          {
            routeTableId: subnet.routeTable.routeTableId,
            destinationCidrBlock: "0.0.0.0/0",
            transitGatewayId: props.tgwId,
          }
        ).addDependency(tgwVpcAttachment);
      });
  }
}
