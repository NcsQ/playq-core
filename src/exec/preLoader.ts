import { config,vars } from "@playq";

// Loading D365 CRM pattern
const d365CrmEnable = config?.addons?.d365Crm?.enable || vars.getConfigValue('addons.d365Crm.enable').toLowerCase().trim()  === 'true';
const d365CrmVersion = config?.addons?.d365Crm?.version || vars.getConfigValue('addons.d365Crm.version').toLowerCase().trim();
if (d365CrmEnable && d365CrmVersion.startsWith("v")) vars.loadFileEntries(`extend/addons/d365Crm/pattern/d365CrmPattern_${d365CrmVersion}.ts`, "d365CrmLocPatterns", "pattern.d365crm");
