document.getElementById("signupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username     = document.getElementById("username").value.trim();
    const email        = document.getElementById("emailInput").value.trim();
    const password     = document.getElementById("passwordInput").value;
    const confirmPwd   = document.getElementById("confirmPasswordInput").value;
    const homeLocation = document.getElementById("homeLocation").value.trim();
  
    if (password !== confirmPwd) {
      return alert("Password and confirm-password must match");
    }
  
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, homeLocation })
      });
      const data = await res.json();
  
      if (res.ok) {
        // 注册成功后跳到登录页
        window.location.href = "/login_page.html";
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  });
  