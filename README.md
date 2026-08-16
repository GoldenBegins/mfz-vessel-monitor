# MFZ Vessel Monitor

واجهة ويب خفيفة لمراقبة ومقارنة حركة السفن بين مصراتة وبنغازي.

## النسخة الحالية

- Read-only dashboard
- Port Calls comparison
- Estimated TEU and General Cargo
- Estimate coverage and confidence
- Vessel Identity Review
- Data Quality notices

## الأمان

هذا المستودع عام، لذلك لا يحتوي على:

- Google Service Account credentials
- Google Sheets private IDs
- MFZ raw operational records
- أي مفاتيح API سرية

`data.json` حاليًا يحتوي فقط على بيانات عرض غير حساسة. في المرحلة التالية سيتم استبداله بملخص آمن يتم توليده من الخادم.

## GitHub Pages

فعّل GitHub Pages من:

`Settings → Pages → Deploy from a branch → main / root`

بعد التفعيل ستظهر الواجهة على GitHub Pages.
