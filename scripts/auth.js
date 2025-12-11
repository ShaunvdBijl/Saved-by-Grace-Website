(() => {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  const setActive = (tab) => {
    const isLogin = tab === "login";
    loginTab?.classList.toggle("active", isLogin);
    signupTab?.classList.toggle("active", !isLogin);
    loginTab?.setAttribute("aria-selected", isLogin.toString());
    signupTab?.setAttribute("aria-selected", (!isLogin).toString());
    loginForm?.classList.toggle("hidden", !isLogin);
    signupForm?.classList.toggle("hidden", isLogin);
  };

  loginTab?.addEventListener("click", () => setActive("login"));
  signupTab?.addEventListener("click", () => setActive("signup"));

  const handleSubmit = (event, type) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    console.log(`[Auth placeholder] ${type}`, payload);
    alert(`This will connect to Firebase (${type}).`);
  };

  loginForm?.addEventListener("submit", (e) => handleSubmit(e, "login"));
  signupForm?.addEventListener("submit", (e) => handleSubmit(e, "signup"));
})();

