document.getElementById("signupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username     = document.getElementById("username").value;
    const email        = document.getElementById("email").value;
    const password     = document.getElementById("password").value;
    const homeLocation = document.getElementById("homeLocation").value;
  
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, homeLocation })
    });
    
    const data = await res.json();
    if (res.ok) {
      // redirect to login or dashboard
      window.location = "/login_page.html";
    } else {
      alert(data.message);
    }
  });
  