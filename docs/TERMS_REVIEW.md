# Provider terms review

Checked on **2026-10-18**. This is an evidence note, not a legal clearance or a finding that the proposed integration is authorized.

The [Caldwell website](https://www.caldwellshooting.com/) links its Terms & Conditions to [AOB's Terms of Use](https://www.aob.com/terms-of-use/). Sections 2 and 10 limit permitted use and discuss restricted access, proprietary materials, collection and trademarks. The page does not establish permission for distributing the proposed third-party Firebase integration. Separate app/service terms may apply and have not been obtained for this project.

Open questions: which terms govern the mobile application's cloud data; whether a customer may use a separate browser client; which web configuration/origins are supported; and whether an open-source integration may be distributed. Resolve those before publishing integration code. Provider [support](https://www.caldwellshooting.com/contactus/?form=ContactUs) is a possible clarification route; no message has been sent.

The local connector is independently written against the Firebase browser SDK. It contains no APK, vendor code, extracted configuration, exporter or user data. Configuration must be supplied locally and requests are limited to the authenticated account. These design choices reduce copying and disclosure concerns; they do not establish service permission. Branding is **VelociTrack**, with a clear unofficial description and no Caldwell/AOB logo or endorsement claim.

The terms were rechecked during connector development. Section 10 addresses non-public systems/content, collection and proprietary rights; the public page still does not resolve whether the mobile cloud supports this third-party client. No provider message or legal clearance has been obtained. Keep external publication of the connector pending resolution of the recorded distribution gate; local technical success alone does not close it.
