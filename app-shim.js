// 5LANCEポータル - Firebase連携シム
//
// このファイルは、Claudeアーティファクト版で使っていた `claude.use("db")` などの
// 呼び出しをそのまま動かすための互換レイヤーです。アプリ本体（index.html内の
// メインスクリプト）は一切変更せずに、Firebase Authentication（Googleログイン）と
// Firestore（データベース）の上で動くようにしています。
(function () {
  "use strict";

  var cfg = window.__FIREBASE_CONFIG || {};
  var allowedDomains = (window.__ALLOWED_DOMAINS || []).map(function (d) {
    return String(d).toLowerCase();
  });

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var firestore = firebase.firestore();
  var storageAvailable = !!(cfg.storageBucket && firebase.storage);

  // ---- 認証状態 ----------------------------------------------------------
  var authState = { status: "pending", user: null }; // pending | signedout | denied | ok
  var deniedEmail = "";
  var readyResolvers = [];
  function isAllowedEmail(email) {
    if (!email || allowedDomains.length === 0) return false;
    var domain = String(email).split("@")[1] || "";
    return allowedDomains.indexOf(domain.toLowerCase()) > -1;
  }
  function settleReady() {
    readyResolvers.forEach(function (fn) {
      fn(authState);
    });
    readyResolvers = [];
  }
  function waitForAuthReady() {
    return new Promise(function (resolve) {
      if (authState.status !== "pending") resolve(authState);
      else readyResolvers.push(resolve);
    });
  }

  function updateGateUI() {
    var gate = document.getElementById("gate");
    var app = document.getElementById("app");
    var titleEl = document.getElementById("g-title");
    var descEl = document.getElementById("g-desc");
    var signinBtn = document.getElementById("g-signin");
    if (!gate) return;
    if (authState.status === "ok") {
      gate.hidden = true;
      if (app) app.hidden = false;
      return;
    }
    gate.hidden = false;
    if (app) app.hidden = true;
    if (signinBtn) signinBtn.hidden = false;
    if (authState.status === "denied") {
      if (titleEl) titleEl.textContent = "アクセスできません";
      if (descEl)
        descEl.textContent =
          (deniedEmail || "このアカウント") +
          " では利用できません。許可されたドメイン（" +
          allowedDomains.join("、") +
          "）のGoogleアカウントでログインしてください。";
    } else if (authState.status === "blocked") {
      if (titleEl) titleEl.textContent = "アクセスが停止されています";
      if (descEl)
        descEl.textContent =
          (deniedEmail || "このアカウント") +
          " は管理者によって利用を停止されています。心当たりがない場合は管理者にお問い合わせください。";
    } else if (authState.status === "unregistered") {
      if (titleEl) titleEl.textContent = "アクセスできません";
      if (descEl)
        descEl.textContent =
          (deniedEmail || "このアカウント") +
          " はスタッフとして登録されていません。管理者に、このGoogleアカウントを「スタッフ一覧」へ登録してもらってください。";
    } else {
      if (titleEl) titleEl.textContent = "5LANCEポータル";
      if (descEl) descEl.textContent = "続けるにはGoogleアカウントでログインしてください。";
    }
  }

  function logAccess(user) {
    try {
      var now = new Date();
      var ymd =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0");
      var ref = firestore.doc("accessLogs/" + ymd + "_" + user.uid);
      ref
        .get()
        .then(function (snap) {
          if (snap.exists) {
            return ref.update({ lastAt: Date.now(), count: (snap.data().count || 0) + 1 });
          }
          return ref.set({
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || "",
            date: ymd,
            firstAt: Date.now(),
            lastAt: Date.now(),
            count: 1,
          });
        })
        .catch(function () {});
    } catch (e) {}
  }

  auth.onAuthStateChanged(function (user) {
    var firstTime = authState.status === "pending";
    if (!user) {
      authState = { status: "signedout", user: null };
      updateGateUI();
      if (firstTime) settleReady();
      return;
    }
    if (!isAllowedEmail(user.email)) {
      deniedEmail = user.email || "";
      authState = { status: "denied", user: null };
      auth.signOut().catch(function () {});
      updateGateUI();
      if (firstTime) settleReady();
      return;
    }
    var emailKey = String(user.email).toLowerCase();
    Promise.all([
      firestore.doc("blockedUsers/" + emailKey).get(),
      firestore.doc("staffEmails/" + emailKey).get(),
    ])
      .then(function (snaps) {
        var blockedSnap = snaps[0];
        var staffSnap = snaps[1];
        if (blockedSnap.exists) {
          deniedEmail = user.email || "";
          authState = { status: "blocked", user: null };
          auth.signOut().catch(function () {});
          return;
        }
        if (!staffSnap.exists) {
          deniedEmail = user.email || "";
          authState = { status: "unregistered", user: null };
          auth.signOut().catch(function () {});
          return;
        }
        authState = { status: "ok", user: user };
        logAccess(user);
      })
      .catch(function () {
        // 確認できない場合は、安全側ではなく通常どおりログインさせる
        // （ネットワーク等の一時的な問題で全員がロックアウトされないように）
        authState = { status: "ok", user: user };
        logAccess(user);
      })
      .then(function () {
        updateGateUI();
        if (firstTime) settleReady();
      });
  });

  document.addEventListener("DOMContentLoaded", function () {
    var signinBtn = document.getElementById("g-signin");
    if (signinBtn) {
      signinBtn.onclick = function () {
        signinBtn.disabled = true;
        var provider = new firebase.auth.GoogleAuthProvider();
        auth
          .signInWithPopup(provider)
          .catch(function (err) {
            var descEl = document.getElementById("g-desc");
            if (descEl && err && err.code !== "auth/popup-closed-by-user") {
              descEl.textContent = "ログインできませんでした。もう一度お試しください。";
            }
          })
          .then(function () {
            signinBtn.disabled = false;
          });
      };
    }
    updateGateUI();
  });

  // ---- Firestore を Claude の db capability 互換の形に包む ----------------
  function wrapDocSnap(snap) {
    return {
      exists: snap.exists,
      data: function () {
        return snap.data();
      },
      id: snap.id,
    };
  }
  function wrapQuerySnap(snap) {
    return {
      docs: snap.docs.map(function (d) {
        return {
          id: d.id,
          data: function () {
            return d.data();
          },
        };
      }),
      size: snap.size,
    };
  }
  function isPlainObject(v) {
    return v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
  }
  function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj).forEach(function (k) {
      var val = obj[k];
      var path = prefix ? prefix + "." + k : k;
      if (isPlainObject(val) && Object.keys(val).length > 0) {
        flatten(val, path, out);
      } else {
        out[path] = val;
      }
    });
    return out;
  }
  function wrapDocRef(ref) {
    return {
      get: function () {
        return ref.get().then(wrapDocSnap);
      },
      set: function (data) {
        return ref.set(data);
      },
      update: function (data) {
        return ref.update(flatten(data));
      },
      delete: function () {
        return ref.delete();
      },
      onSnapshot: function (cb, errCb) {
        return ref.onSnapshot(function (s) {
          cb(wrapDocSnap(s));
        }, errCb);
      },
    };
  }
  function wrapQuery(q) {
    return {
      get: function () {
        return q.get().then(wrapQuerySnap);
      },
      add: q.add
        ? function (data) {
            return q.add(data);
          }
        : undefined,
      onSnapshot: function (cb, errCb) {
        return q.onSnapshot(function (s) {
          cb(wrapQuerySnap(s));
        }, errCb);
      },
      where: function (f, op, v) {
        return wrapQuery(q.where(f, op, v));
      },
      orderBy: function (f, dir) {
        return wrapQuery(q.orderBy(f, dir));
      },
      limit: function (n) {
        return wrapQuery(q.limit(n));
      },
    };
  }
  function makeDbShim() {
    return {
      doc: function (path) {
        return wrapDocRef(firestore.doc(path));
      },
      collection: function (path) {
        return wrapQuery(firestore.collection(path));
      },
    };
  }

  // ---- room（リアルタイム通知）シム ---------------------------------------
  function makeRoomShim() {
    var coll = firestore.collection("roomEvents");
    var startTs = Date.now();
    var listeners = {};
    var subscribed = false;
    function ensureSub() {
      if (subscribed) return;
      subscribed = true;
      coll
        .where("ts", ">", startTs)
        .onSnapshot(function (snap) {
          snap.docChanges().forEach(function (ch) {
            if (ch.type !== "added") return;
            var v = ch.doc.data();
            (listeners[v.topic] || []).forEach(function (fn) {
              try {
                fn(v.data);
              } catch (e) {}
            });
          });
        }, function () {});
    }
    return {
      emit: function (topic, data) {
        return coll.add({ topic: topic, data: data, ts: Date.now() });
      },
      on: function (topic, fn) {
        ensureSub();
        listeners[topic] = listeners[topic] || [];
        listeners[topic].push(fn);
      },
    };
  }

  // ---- downloads シム -----------------------------------------------------
  function makeDownloadsShim() {
    return {
      save: function (opts) {
        return new Promise(function (resolve, reject) {
          try {
            var blob = new Blob([opts.data], { type: "text/csv;charset=utf-8" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = opts.filename || "download.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () {
              URL.revokeObjectURL(url);
            }, 2000);
            resolve({ saved: true });
          } catch (e) {
            reject(e);
          }
        });
      },
    };
  }

  // ---- assets（Firebase Storage）シム --------------------------------------
  function makeAssetsShim() {
    if (!storageAvailable) return null;
    var storage;
    try {
      storage = firebase.storage();
    } catch (e) {
      return null;
    }
    return {
      upload: function (file) {
        var path =
          "uploads/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "_" + file.name;
        var ref = storage.ref().child(path);
        return ref.put(file).then(function (snap) {
          return snap.ref.getDownloadURL().then(function (url) {
            return { id: path, url: url, sizeBytes: file.size, contentType: file.type || "" };
          });
        });
      },
      delete: function (id) {
        return storage
          .ref()
          .child(id)
          .delete()
          .catch(function () {});
      },
    };
  }

  // ---- user シム ------------------------------------------------------------
  function makeUserShim() {
    return {
      canEdit: function () {
        return true;
      },
      can: function () {
        return true;
      },
      isOwner: function () {
        return false;
      },
    };
  }

  // ---- window.claude.use(...) 互換API ---------------------------------------
  window.claude = {
    use: function (name) {
      return waitForAuthReady().then(function (state) {
        if (name === "downloads") return makeDownloadsShim();
        if (state.status !== "ok") return null;
        if (name === "db") return makeDbShim();
        if (name === "user") return makeUserShim();
        if (name === "room") return makeRoomShim();
        if (name === "assets") return makeAssetsShim();
        return null;
      });
    },
  };
})();
