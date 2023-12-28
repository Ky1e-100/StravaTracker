document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const createForm = document.getElementById("createACC");
    const login = document.getElementById("login");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        console.log(username);
        console.log(password);

        // Create an object with the login data
        const loginData = {
            username: username,
            password: password
        };

        let xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    try {
                        let contentType = this.getResponseHeader('Content-Type');
                        let responseData = this.responseText;

                        if (contentType && contentType.includes('application/json')) {
                            // If the response is JSON, parse it
                            let responseObj = JSON.parse(responseData);

                            // Check the server response
                            if (responseObj.success) {
                                // Redirect to the home page or perform other actions for successful login
                                window.location.href = "/home";
                            } else {
                                // Handle server error or other issues
                                console.error("Server error:", responseObj.error);
                                document.getElementById("loginMessage").innerText = "Username or password is incorrect.";
                            }
                        } else if (contentType && contentType.includes('text/html')) {
                            // If the response is HTML, redirect to the login page
                            console.log("Received HTML response. Redirecting to login page.");
                            window.location.href = "/home";
                        } else {
                            // Handle other types of responses
                            console.error("Unexpected response type:", contentType);
                        }
                    } catch (error) {
                        // Handle JSON parsing error
                        console.error("Error parsing response:", error);
                    }
                } else {
                    // Handle server error or other issues
                    console.error("Server error:", this.status, this.statusText);
                    document.getElementById("loginMessage").innerText = "Username or password is incorrect.";
                }
            }
        };

        xhttp.open("POST", "/loginAuth"); // API .open(METHOD, URL)
        xhttp.setRequestHeader("Content-Type", "application/json"); // Set the request header
        xhttp.send(JSON.stringify(loginData)); // API .send(BODY)
    });

    const createAccountButton = document.getElementById("createAccount");
    createAccountButton.addEventListener("click", function (event) {
        // Hide the login div
        login.style.display = 'none';
        // Show the createACC div
        createForm.style.display = 'block';
    });

    createForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const username = document.getElementById("usernameC").value;
        const password = document.getElementById("passwordC").value;
        const token = document.getElementById("token").value;

        // Create an object with the login data
        const loginData = {
            username: username,
            password: password,
            token: token
        };

        console.log(loginData);
        if (username != '' && password != '' && token != '') {
            try {
                const response = await fetch('/createAcc', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(loginData),
                });

                if (response.ok) {
                    // Handle success, e.g., redirect to login page
                    window.location.href = "/login";
                } else {
                    // Handle error response
                    const errorData = await response.json();
                    console.error("Server error:", errorData.message);
                    document.getElementById("loginMessage").innerText = "ERROR";
                }
            } catch (error) {
                // Handle network or other errors
                console.error("Network error:", error);
                document.getElementById("loginMessage").innerText = "ERROR";
            }
        }

    });
});
