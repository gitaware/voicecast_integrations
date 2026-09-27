# VoiceCast integrations

Connect VoiceCast to monitoring platforms, automation tools and CRM systems to
turn alerts, workflow events and customer updates into telephone calls. Each
integration queues calls through the VoiceCast Calls v2 API and includes its own
installation and configuration guide.

A successful API response means the call was queued. VoiceCast's dispatcher
places the call asynchronously and records the final status and callflow events.

## Monitoring and alerting

| Logo | Integration | What it does |
| :---: | --- | --- |
| [<img src="zabbix/zabbix.svg" alt="Zabbix" width="38" height="38">](zabbix/) | [Zabbix](zabbix/) | Turn Zabbix problems, recoveries and escalation messages into voice calls. |
| [<img src="icinga/icinga.svg" alt="Icinga" width="38" height="38">](icinga/) | [Icinga 2](icinga/) | Send host and service notifications through a VoiceCast callflow. |
| [<img src="prtg/prtg.svg" alt="PRTG" width="38" height="38">](prtg/) | [PRTG Network Monitor](prtg/) | Run a PowerShell notification client when PRTG raises an alarm. |
| [<img src="grafana/grafana.svg" alt="Grafana" width="38" height="38">](grafana/) | [Grafana Alerting](grafana/) | Use a webhook contact point to call recipients for Grafana alert groups. |

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

## CRM and customer workflows

| Logo | Integration | What it does |
| :---: | --- | --- |
| [<img src="hubspot/hubspot.svg" alt="HubSpot" width="38" height="38">](hubspot/) | [HubSpot](hubspot/) | Queue calls from contact, company, deal and ticket workflows. |
| [<img src="salesforce/salesforce.svg" alt="Salesforce" width="38" height="38">](salesforce/) | [Salesforce](salesforce/) | Deploy an invocable Apex action for Salesforce Flow. |
| [<img src="sugarcrm/sugarcrm.svg" alt="SugarCRM" width="38" height="38">](sugarcrm/) | [SugarCRM](sugarcrm/) | Trigger calls when configured Case or Lead fields change. |
| [<img src="suitecrm/suitecrm.svg" alt="SuiteCRM" width="48" height="32">](suitecrm/) | [SuiteCRM](suitecrm/) | Trigger calls from SuiteCRM Case and Lead state changes. |

## Before testing

You need a VoiceCast tenant URL, API key and callflow UUID. The VoiceCast call
dispatcher must be running, and the server or service using an integration must
be able to reach the tenant over HTTPS. Tests can place real telephone calls, so
use a controlled recipient and callflow.

Repository maintainers can run the integration contract tests from the project
root:

```bash
python3 -m unittest integrations/test_integration_contracts.py -v
```
