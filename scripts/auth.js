(() => {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authMessage = document.getElementById("authMessage");

  const setActive = (tab) => {
    const isLogin = tab === "login";
    loginTab?.classList.toggle("active", isLogin);
    signupTab?.classList.toggle("active", !isLogin);
    loginTab?.setAttribute("aria-selected", isLogin.toString());
    signupTab?.setAttribute("aria-selected", (!isLogin).toString());
    loginForm?.classList.toggle("hidden", !isLogin);
    signupForm?.classList.toggle("hidden", isLogin);
    clearMessage();
  };

  loginTab?.addEventListener("click", () => setActive("login"));
  signupTab?.addEventListener("click", () => setActive("signup"));

  const showMessage = (message, type = "error") => {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.setAttribute("role", "alert");
    authMessage.style.display = "block";
  };

  const clearMessage = () => {
    if (authMessage) {
      authMessage.textContent = "";
      authMessage.className = "auth-message";
      authMessage.style.display = "none";
    }
  };

  const waitForFirebase = () =>
    new Promise((resolve, reject) => {
      // Fast path
      if (window.firebaseAuth && window.firebaseDb) {
        resolve(true);
        return;
      }

      let settled = false;

      const finish = (ok, message) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poller);
        window.removeEventListener('firebaseReady', onReady);
        window.removeEventListener('firebaseError', onError);
        ok ? resolve(true) : reject(new Error(message));
      };

      const timeout = setTimeout(() => {
        finish(false, "Firebase initialization timeout. Please refresh the page or check your network.");
      }, 15000); // 15s timeout

      const poller = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb) {
          finish(true);
        }
      }, 200);

      const onReady = () => {
        if (window.firebaseAuth && window.firebaseDb) {
          finish(true);
        }
      };

      const onError = (event) => {
        const msg = event?.detail?.error?.message || "Unknown Firebase initialization error";
        finish(false, `Firebase initialization failed: ${msg}`);
      };

      window.addEventListener('firebaseReady', onReady);
      window.addEventListener('firebaseError', onError);
    });

  const handleSignUp = async (event) => {
    event.preventDefault();
    clearMessage();

    const formData = new FormData(event.target);
    const firstName = formData.get("firstName")?.trim();
    const lastName = formData.get("lastName")?.trim();
    const phone = formData.get("phone")?.trim();
    const email = formData.get("email")?.trim();
    const password = formData.get("password");

    // Validation
    if (!firstName || !lastName || !phone || !email || !password) {
      showMessage("Please fill in all fields.");
      return;
    }

    const phoneOk = /^\d{9}$/.test(phone);
    if (!phoneOk) {
      showMessage("Phone number must be exactly 9 digits.");
      return;
    }

    const passwordOk = validatePassword(password);
    if (!passwordOk.valid) {
      showMessage(passwordOk.message);
      return;
    }

    try {
      await waitForFirebase();

      // Import Firebase Auth functions
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);

      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // Store user information in Firestore
      await setDoc(doc(window.firebaseDb, "users", user.uid), {
        uid: user.uid,
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone,
        email: email,
        role: "user",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Success message
      showMessage(`Account created successfully! Welcome, ${firstName}!`, "success");
      
      // Clear form
      signupForm.reset();
      
      // Optionally switch to login tab after a delay
      setTimeout(() => {
        setActive("login");
      }, 2000);

    } catch (error) {
      console.error("Sign up error:", error);
      
      // Handle specific Firebase errors
      let errorMessage = "An error occurred during sign up. Please try again.";
      
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered. Please use a different email or try logging in.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak. Please choose a stronger password.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection and try again.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      showMessage(errorMessage);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    clearMessage();

    const formData = new FormData(event.target);
    const email = formData.get("email")?.trim();
    const password = formData.get("password");

    if (!email || !password) {
      showMessage("Please fill in all fields.");
      return;
    }

    try {
      await waitForFirebase();

      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      await signInWithEmailAndPassword(window.firebaseAuth, email, password);
      
      showMessage("Login successful! Redirecting...", "success");

      // Fetch role and redirect accordingly
      try {
        const role = await fetchUserRole(window.firebaseDb, userCredential.user.uid);
        const destination = role === "user" ? "dashboard.html" : "index.html";
        setTimeout(() => {
          window.location.href = destination;
        }, 800);
      } catch (err) {
        console.warn("Could not fetch user role, defaulting to dashboard:", err);
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 800);
      }

    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email. Please sign up first.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password. Please try again.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection and try again.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      showMessage(errorMessage);
    }
  };

  loginForm?.addEventListener("submit", handleLogin);
  signupForm?.addEventListener("submit", handleSignUp);

  async function fetchUserRole(db, uid) {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return "user";
    const data = snap.data();
    return data.role || "user";
  }

  function validatePassword(pw) {
    if (!pw || pw.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters." };
    }
    const specials = pw.match(/[^A-Za-z0-9]/g)?.length || 0;
    if (specials < 2) {
      return { valid: false, message: "Password needs at least 2 special characters." };
    }
    if (!/[A-Z]/.test(pw)) {
      return { valid: false, message: "Password needs at least one uppercase letter." };
    }
    if (!/[a-z]/.test(pw)) {
      return { valid: false, message: "Password needs at least one lowercase letter." };
    }
    return { valid: true, message: "" };
  }
})();



