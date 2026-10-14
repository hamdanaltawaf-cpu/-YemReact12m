# YemReact UI Source Extraction

هذه الحزمة هي **استخراج مرجعي للقراءة فقط** من واجهات مشروع YemReact بتاريخ 2026-08-31. لم تُعدّل ملفات المشروع الأصلي، ولا تُستورد هذه الملفات في التطبيق.

## 1. Main Layout & Landing Page

| الملف المستخرج | المسار الأصلي |
|---|---|
| `01-main-layout/App.tsx` | `client/src/App.tsx` |
| `01-main-layout/Home.tsx` | `client/src/pages/Home.tsx` |
| `styles/01-main-layout.css` | قواعد مطابقة مستخرجة حرفيًا من `client/src/index.css` |

## 2. Header & Navigation

| الملف المستخرج | المسار الأصلي |
|---|---|
| `02-header-navigation/SiteSidebar.tsx` | `client/src/components/SiteSidebar.tsx` |
| `02-header-navigation/LibraryHeader.tsx` | `client/src/components/LibraryHeader.tsx` |
| `styles/02-header-navigation.css` | قواعد مطابقة مستخرجة حرفيًا من `client/src/index.css` |

رغم أن اسم `SiteSidebar.tsx` تاريخي، فهو يحتوي في النسخة الحالية على بنية الـ Top Header والتنقل العام.

## 3. Sidebars & Dropdown Menus

| الملف المستخرج | المسار الأصلي |
|---|---|
| `03-sidebars-dropdowns/SiteSidebar.tsx` | `client/src/components/SiteSidebar.tsx` |
| `03-sidebars-dropdowns/SidebarGuestSignIn.tsx` | `client/src/components/SidebarGuestSignIn.tsx` |
| `styles/03-sidebars-dropdowns.css` | قواعد القوائم الجانبية والمنسدلة والتصنيفات من `client/src/index.css` |

## 4. Account / Profile Page

| الملف المستخرج | المسار الأصلي |
|---|---|
| `04-account/Account.tsx` | `client/src/pages/Account.tsx` |
| `styles/04-account.css` | قواعد الحساب والمحفظات والمساهمات من `client/src/index.css` |

## 5. Auth / Login

| الملف المستخرج | المسار الأصلي |
|---|---|
| `05-auth/GoogleSignInButton.tsx` | `client/src/components/GoogleSignInButton.tsx` |
| `05-auth/SidebarGuestSignIn.tsx` | `client/src/components/SidebarGuestSignIn.tsx` |
| `styles/05-auth.css` | قواعد Google Sign-In والحالات المرتبطة من `client/src/index.css` |

## 6. Reaction Cards

| الملف المستخرج | المسار الأصلي |
|---|---|
| `06-reaction-cards/ReactionCard.tsx` | `client/src/components/ReactionCard.tsx` |
| `06-reaction-cards/ReactionVideoPlayer.tsx` | `client/src/components/ReactionVideoPlayer.tsx` |
| `styles/06-reaction-cards.css` | قواعد البطاقات والشبكة والمشغل من `client/src/index.css` |

## CSS Source

`styles/index.css.original` نسخة كاملة من `client/src/index.css` كما كانت وقت الاستخراج. ملفات CSS المرقمة هي مقتطفات مرجعية حسب عائلة الواجهة، وتحافظ على نص القواعد وترتيبها الأصلي. قد تتكرر بعض القواعد المشتركة في أكثر من ملف لأن المصدر الأصلي يستخدم selectors مجمعة.

## ملاحظة التتبع

الملفات المنسوخة داخل هذه الحزمة ليست بدائل تشغيلية لملفات التطبيق؛ الغرض منها عرض البنية الحالية وربطها بمواقعها الأصلية فقط.
