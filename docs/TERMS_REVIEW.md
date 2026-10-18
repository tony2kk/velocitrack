# Provider terms review

Checked on **2026-10-18**. This is an evidence note, not a legal clearance or a finding that the proposed integration is authorized.

The [Caldwell website](https://www.caldwellshooting.com/) links its Terms & Conditions to [AOB's Terms of Use](https://www.aob.com/terms-of-use/). Sections 2 and 10 limit permitted use and discuss restricted access, proprietary materials, collection and trademarks. The page does not establish permission for distributing the proposed third-party Firebase integration. Separate app/service terms may apply and have not been obtained for this project.

Open questions: which terms govern the mobile application's cloud data; whether a customer may use a separate browser client; which web configuration/origins are supported; and whether the provider permits distribution of an open-source integration. Provider [support](https://www.caldwellshooting.com/contactus/?form=ContactUs) is a possible clarification route; no message has been sent.

The connector is independently written against the Firebase browser SDK. It contains no APK, vendor code, exporter or user data. The owner later explicitly requested the standard two-field public client configuration described in decision 005. Requests remain limited to the authenticated account. These design choices do not establish service permission. Branding is **VelociTrack**, with a clear unofficial description and no Caldwell/AOB logo or endorsement claim.

The terms were rechecked during connector development. Section 10 addresses non-public systems/content, collection and proprietary rights; the public page still does not resolve whether the mobile cloud supports this third-party client. No provider message or legal clearance has been obtained.

## Owner publication decision — 2026-10-18

After the available terms and unresolved scope were presented, the owner stated that they had found no explicit prohibition and instructed the project to continue. This explicitly authorizes publishing the independently written connector under the existing commit-and-push workflow. It records the owner's decision, not a finding that silence grants permission or that Caldwell endorses this client. The same publication approval does not need to be requested again.

The owner intends to contact Caldwell once the application is sufficiently functional and will handle that communication themselves. Continue to exclude private data and configuration beyond the explicitly approved public client metadata, use the unofficial identity, respect service controls, and record any new provider guidance. The owner separately authorized Pages deployment and standard Caldwell source configuration on 2026-10-18; see decision 005.
