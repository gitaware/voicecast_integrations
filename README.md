# VoiceCast integrations

Connect VoiceCast to monitoring platforms, automation tools and CRM systems to
turn alerts, workflow events and customer updates into telephone calls. Each
integration queues calls through the VoiceCast Calls v2 API and includes its own
installation and configuration guide.

A successful API response means the call was queued. VoiceCast's dispatcher
places the call asynchronously and records the final status and callflow events.

## Before installing

You need a VoiceCast tenant URL, API key and callflow UUID. You can get these from CloudAware by requesting Voicecast access from voicecast@cloudaware.eu

## Monitoring and alerting

| Logo | Integration | What it does |
| :---: | --- | --- |
| [<img src="zabbix/zabbix.svg" alt="Zabbix" width="38" height="38">](zabbix/) | [Zabbix](zabbix/) | Turn Zabbix problems, recoveries and escalation messages into voice calls. |
| [<img src="icinga/icinga.svg" alt="Icinga" width="38" height="38">](icinga/) | [Icinga 2](icinga/) | Send host and service notifications through a VoiceCast callflow. |
| [<img src="prtg/prtg.svg" alt="PRTG" width="38" height="38">](prtg/) | [PRTG Network Monitor](prtg/) | Run a PowerShell notification client when PRTG raises an alarm. |
| [<img src="grafana/grafana.svg" alt="Grafana" width="38" height="38">](grafana/) | [Grafana Alerting](grafana/) | Use a webhook contact point to call recipients for Grafana alert groups. |
| [<img src="librenms/librenms.svg" alt="LibreNMS" width="38" height="38">](librenms/) | [LibreNMS](librenms/) | Send device and service alerts through the native API transport. |
| [<img src="uptime-kuma/uptime-kuma.svg" alt="Uptime Kuma" width="38" height="38">](uptime-kuma/) | [Uptime Kuma](uptime-kuma/) | Call responders from built-in webhook notifications. |
| [<img src="checkmk/checkmk.svg" alt="Checkmk" width="38" height="38">](checkmk/) | [Checkmk](checkmk/) | Run a site-local notification script for host and service state changes. |
| [<img src="mikrotik/mikrotik.svg" alt="MikroTik" width="38" height="38">](mikrotik/) | [MikroTik RouterOS](mikrotik/) | Queue spoken alerts directly from Netwatch, the scheduler or another on-router script. |
| [<img src="fortigate/fortigate.svg" alt="FortiGate" width="38" height="38">](fortigate/) | [FortiGate](fortigate/) | Turn FortiGate security, SD-WAN and system events into spoken telephone alerts. |

## Automation and orchestration

| Logo | Integration | What it does |
| :---: | --- | --- |
| [<img src="curl/curl.svg" alt="curl" width="38" height="38">](curl/) | [curl](curl/) | Place immediate or scheduled calls from a terminal or shell script. |
| [<img src="home-assistant/home-assistant.svg" alt="Home Assistant" width="38" height="38">](home-assistant/) | [Home Assistant](home-assistant/) | Trigger reusable VoiceCast call actions from automations and dashboards. |
| [<img src="monday/monday.svg" alt="monday.com" width="38" height="38">](monday/) | [monday.com](monday/) | Add a VoiceCast call action to monday workflows. |
| [<img src="n8n/n8n.svg" alt="n8n" width="38" height="38">](n8n/) | [n8n](n8n/) | Import a reusable workflow for calls from other n8n workflows. |
| [<img src="node-red/node-red.svg" alt="Node-RED" width="38" height="38">](node-red/) | [Node-RED](node-red/) | Add a VoiceCast call node to event-driven flows. |
| [<img src="apache-airflow/apache-airflow.svg" alt="Apache Airflow" width="38" height="38">](apache-airflow/) | [Apache Airflow](apache-airflow/) | Queue templated calls from DAGs and return the call UUID through XCom. |
| [<img src="zapier/zapier.svg" alt="Zapier" width="38" height="38">](zapier/) | [Zapier](zapier/) | Add a Place VoiceCast Call action to Zaps. |
| [<img src="make/make.svg" alt="Make" width="38" height="38">](make/) | [Make](make/) | Add a VoiceCast action module to Make scenarios. |
| [<img src="windmill/windmill.svg" alt="Windmill" width="38" height="38">](windmill/) | [Windmill](windmill/) | Place calls from scripts, schedules, webhooks, Flows and Apps. |

## Developer libraries

| Logo | Integration | What it does |
| :---: | --- | --- |
| [<img src="php/php.svg" alt="PHP" width="38" height="38">](php/) | [PHP](php/) | Add immediate and scheduled calls to PHP applications with a reusable client class. |
| [<img src="python/python.svg" alt="Python" width="38" height="38">](python/) | [Python](python/) | Add immediate and scheduled calls to Python applications with a standard-library client class. |
| [<img src="mcp/mcp.svg" alt="Model Context Protocol" width="38" height="38">](mcp/) | [Model Context Protocol](mcp/) | Connect MCP clients to tenant-scoped callflow and call tools over STDIO or authenticated HTTP. |

## CRM and customer workflows

| Logo | Integration | What it does |
| :---: | --- | --- |
| [<img src="hubspot/hubspot.svg" alt="HubSpot" width="38" height="38">](hubspot/) | [HubSpot](hubspot/) | Queue calls from contact, company, deal and ticket workflows. |
| [<img src="salesforce/salesforce.svg" alt="Salesforce" width="38" height="38">](salesforce/) | [Salesforce](salesforce/) | Deploy an invocable Apex action for Salesforce Flow. |
| [<img src="sugarcrm/sugarcrm.svg" alt="SugarCRM" width="38" height="38">](sugarcrm/) | [SugarCRM](sugarcrm/) | Trigger calls when configured Case or Lead fields change. |
| [<img src="suitecrm/suitecrm.svg" alt="SuiteCRM" width="48" height="32">](suitecrm/) | [SuiteCRM](suitecrm/) | Trigger calls from SuiteCRM Case and Lead state changes. |
