import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { InspectionVpc } from "./constructs/inspection-vpc";
import { SpokeVpc } from "./constructs/spoke-vpc";
import { Tgw } from "./constructs/tgw";
import { TgwVpcAttachment } from "./constructs/tgw-vpc-attachment";
import { TgwRouteTable } from "./constructs/tgw-route-table";
import { Ec2Instance } from "./constructs/ec2-instance";
import { NetworkFirewall } from "./constructs/network-firewall";

export class NetworkFirewallStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const inspectionVpc = new InspectionVpc(this, "Inspection Vpc", {
      vpcCidr: "10.0.1.0/24",
    });
    const spokeVpc = new SpokeVpc(this, "Spoke Vpc", {
      vpcCidr: "10.0.2.0/24",
    });

    // Transit Gateway
    const tgw = new Tgw(this, "Tgw");

    // Transit Gateway attachment
    const tgwVpcAttachmentInspectionVpc = new TgwVpcAttachment(
      this,
      "Tgw Vpc Attachment Inspection Vpc",
      {
        tgwId: tgw.tgwId,
        vpc: inspectionVpc.vpc,
        isInspectionVpc: true,
      }
    );
    const tgwVpcAttachmentSpokeVpc = new TgwVpcAttachment(
      this,
      "Tgw Vpc Attachment Spoke Vpc",
      {
        tgwId: tgw.tgwId,
        vpc: spokeVpc.vpc,
        isInspectionVpc: false,
      }
    );

    // Transit Gateway route table
    new TgwRouteTable(this, "Tgw Route Table Inspection Vpc", {
      tgwId: tgw.tgwId,
      associateTgwAttachmentIds: [
        tgwVpcAttachmentInspectionVpc.tgwVpcAttachmentId,
      ],
      propagationTgwAttachmentIds: [
        tgwVpcAttachmentSpokeVpc.tgwVpcAttachmentId,
      ],
    });
    new TgwRouteTable(this, "Tgw Route Table Spoke Vpc", {
      tgwId: tgw.tgwId,
      associateTgwAttachmentIds: [tgwVpcAttachmentSpokeVpc.tgwVpcAttachmentId],
      propagationTgwAttachmentIds: [
        tgwVpcAttachmentInspectionVpc.tgwVpcAttachmentId,
      ],
      inspectionVpcTgwAttachmentId:
        tgwVpcAttachmentInspectionVpc.tgwVpcAttachmentId,
    });

    // Network Firewall
    new NetworkFirewall(this, "Network Firewall", {
      vpc: inspectionVpc.vpc,
    });

    // EC2 Instance
    new Ec2Instance(this, "Ec2 Instance", {
      vpc: spokeVpc.vpc,
    });
  }
}
