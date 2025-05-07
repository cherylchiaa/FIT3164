document.addEventListener("DOMContentLoaded", () => {
    // Pre-fill values from localStorage
    const username = localStorage.getItem("username");
    const email = localStorage.getItem("emailInput");
    const location = localStorage.getItem("homeLocation");
  
    if (username) {
        document.getElementById("username-placeholder").value = username;
        document.getElementById("username-header").textContent = username;
    }
    if (email) {
        document.getElementById("email-placeholder").value = email;
    }
    if (location) {
        document.getElementById("location-placeholder").value = location;
    }
});

document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const username = document.getElementById("username-placeholder").value.trim();
    const email = document.getElementById("email-placeholder").value.trim();
    const homeLocation = document.getElementById("location-placeholder").value.trim();
  
    const oldPassword = document.getElementById("old-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
  
    // Validate passwords
    if (newPassword || confirmPassword || oldPassword) {
        if (!oldPassword || !newPassword || !confirmPassword) {
            return alert("Please fill out all password fields to change your password.");
        }
  
        if (newPassword !== confirmPassword) {
            return alert("New passwords do not match.");
        }
    }
  
    const payload = {
        username,
        email,
        homeLocation,
        ...(newPassword && { oldPassword, newPassword }) // only include password fields if provided
    };
  
    try {
        const res = await fetch("/api/auth/update", {
            method: "POST", // or PUT, depending on your backend
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    
        const result = await res.json();
    
        if (res.ok) {
            alert("✅ Profile updated successfully");
    
            // Optional: update localStorage
            localStorage.setItem("username", username);
            localStorage.setItem("emailInput", email);
            localStorage.setItem("homeLocation", homeLocation);
            document.getElementById("username-header").textContent = username;

            // ✅ Clear password fields after saving
            document.getElementById("old-password").value = "";
            document.getElementById("new-password").value = "";
            document.getElementById("confirm-password").value = "";
        } else {
            alert(result.message || "❌ Failed to update profile");
        }
        } catch (err) {
            console.error(err);
            alert("❌ Network error");
        }
});
  
let locations = [];

fetch('all-suburbs-with-coords.json')
  .then(res => res.json())
  .then(data => {
    locations = data;
    console.log("✅ Place data loaded.");
  })
  .catch(err => console.error("❌ Failed to load all-suburbs.json:", err));
  
function showLocationSuggestions() {
    const input = document.getElementById("location-placeholder").value.toLowerCase();
    const suggestionList = document.getElementById("suggestion-list");
  
    suggestionList.innerHTML = '';
  
    const matches = input
      ? locations.filter(loc =>
          (loc.suburb || loc.state).toLowerCase().startsWith(input)
        ).slice(0, 5)
      : locations.slice(0, 8);
  
    matches.forEach(loc => {
      const name = loc.suburb || loc.state;
      const li = document.createElement("li");
      li.textContent = name;
  
      li.onclick = () => {
        document.getElementById("location-placeholder").value = name;
        suggestionList.innerHTML = '';
        suggestionList.style.display = 'none';
      };
  
      suggestionList.appendChild(li);
    });
  
    suggestionList.style.display = matches.length ? 'block' : 'none';
  }
  