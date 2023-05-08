import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface NetworkFirewallRoutingProps {
  networkFirewall: cdk.aws_networkfirewall.CfnFirewall;
  vpc: cdk.aws_ec2.IVpc;
}

export class NetworkFirewallRouting extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: NetworkFirewallRoutingProps
  ) {
    super(scope, id);

    // Firewall attachment Subnets
    const firewallSubnetIds = props.vpc.selectSubnets({
      subnetGroupName: "Firewall",
    }).subnetIds;

    // Routing NAT Gateway to Network Firewall
    props.vpc.publicSubnets.forEach((subnet, index) => {
      const az = subnet.availabilityZone;

      const destinationSubnets = props.vpc.selectSubnets({
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        availabilityZones: [az],
      }).subnets;

      destinationSubnets.forEach((destinationSubnet) => {
        if (firewallSubnetIds.includes(destinationSubnet.subnetId)) {
          return;
        }

        const destinationCidrBlock = destinationSubnet.ipv4CidrBlock;

        new cdk.aws_ec2.CfnRoute(
          this,
          `Route Nat Gateway To Network Firewall ${destinationCidrBlock}`,
          {
            routeTableId: subnet.routeTable.routeTableId,
            destinationCidrBlock,
            vpcEndpointId: cdk.Fn.select(
              1,
              cdk.Fn.split(
                ":",
                cdk.Fn.select(
                  index % firewallSubnetIds.length,
                  props.networkFirewall.attrEndpointIds
                )
              )
            ),
          }
        );
      });

      new cdk.aws_ec2.CfnRoute(
        this,
        `Route To Tgw For Class A Private IP Address ${index}`,
        {
          routeTableId: subnet.routeTable.routeTableId,
          destinationCidrBlock: "10.0.0.0/8",
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(
                index % firewallSubnetIds.length,
                props.networkFirewall.attrEndpointIds
              )
            )
          ),
        }
      );
    });

    // Routing Egress Subnet to Network Firewall
    props.vpc.privateSubnets.forEach((subnet, index) => {
      if (firewallSubnetIds.includes(subnet.subnetId)) {
        return;
      }

      const defaultRoute = subnet.node.children.find(
        (child) => child.node.id == "DefaultRoute"
      ) as cdk.aws_ec2.CfnRoute;
      defaultRoute.addDeletionOverride("Properties.NatGatewayId");

      defaultRoute.addOverride(
        "Properties.VpcEndpointId",
        cdk.Fn.select(
          1,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(
              index % firewallSubnetIds.length,
              props.networkFirewall.attrEndpointIds
            )
          )
        )
      );
    });
  }
}
