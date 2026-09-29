// 5LANCEポータル - Firebase設定ファイル
//
// Firebaseコンソール（https://console.firebase.google.com/）で作成したプロジェクトの
// 「プロジェクトの設定 > 全般 > マイアプリ > SDK の設定と構成」に表示される
// firebaseConfig の値を、そのまま下に貼り付けてください。
//
// これらの値は「公開されても問題ない」設計になっています（実際のアクセス制御は
// Firebase Authentication と Firestore のセキュリティルールで行われます）。

window.__FIREBASE_CONFIG = {
  apiKey: "AIzaSyCXMbdV1-SAFczBkup_0O77-rQ63BO8Bd8",
  authDomain: "lance-portal.firebaseapp.com",
  projectId: "lance-portal",
  storageBucket: "lance-portal.firebasestorage.app",
  messagingSenderId: "961493063873",
  appId: "1:961493063873:web:99adfb4c9b14b4579d1c40"
};

// ログインを許可するメールアドレスのドメイン（@より後ろの部分）。
// 複数ある場合は配列に追加してください。例: ["5lance.co.jp", "example.com"]
window.__ALLOWED_DOMAINS = ["5lance.co.jp"];
