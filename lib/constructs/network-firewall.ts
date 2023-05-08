import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkFirewallRuleGroupSuricata } from "./network-firewall-rule-group-suricata";
import { NetworkFirewallPolicy } from "./network-firewall-policy";
import { NetworkFirewallLogs } from "./network-firewall-logs";
import { NetworkFirewallRouting } from "./network-firewall-routing";

export interface NetworkFirewallProps {
  vpc: cdk.aws_ec2.IVpc;
}

export class NetworkFirewall extends Construct {
  constructor(scope: Construct, id: string, props: NetworkFirewallProps) {
    super(scope, id);

    // Network Firewall rule group
    // Suricata compatible IPS rules
    const networkFirewallRuleGroupSuricata =
      new NetworkFirewallRuleGroupSuricata(
        this,
        "Network Firewall Rule Group Suricata"
      );

    // Network Firewall policy
    const networkFirewallPolicy = new NetworkFirewallPolicy(
      this,
      "Network Firewall Policy",
      {
        statefulRuleGroupReferences: [
          {
            Priority: 1,
            ResourceArn:
              networkFirewallRuleGroupSuricata.ruleGroup.attrRuleGroupArn,
          },
        ],
      }
    );

    // Network Firewall
    const networkFirewall = new cdk.aws_networkfirewall.CfnFirewall(
      this,
      "Default",
      {
        firewallName: "network-firewall",
        firewallPolicyArn:
          networkFirewallPolicy.firewallPolicy.attrFirewallPolicyArn,
        vpcId: props.vpc.vpcId,
        subnetMappings: props.vpc
          .selectSubnets({
            subnetGroupName: "Firewall",
          })
          .subnetIds.map((subnetId) => {
            return {
              subnetId: subnetId,
            };
          }),
        deleteProtection: false,
        subnetChangeProtection: false,
      }
    );

    // Network Firewall logs
    new NetworkFirewallLogs(this, "Network Firewall Logs", {
      networkFirewall,
    });

    // Network Firewall Routing
    new NetworkFirewallRouting(this, "Network Firewall Routing", {
      networkFirewall,
      vpc: props.vpc,
    });
  }
}
