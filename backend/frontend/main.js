function $e(t='div',p={},c=[]){
    let el=document.createElement(t);
    Object.assign(el,p);
    el.append(...c);
    return el;
}
  
const $t=document.createTextNode.bind(document);


function httpGetAsync(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);
}

function httpPostAsync(url, content, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("POST", url, true); // true for asynchronous 
    xmlHttp.setRequestHeader("Content-Type", "text/plain");
    xmlHttp.send(content);
}

function loadMainContent(login, main, textArea, todoContainer) {
    login.style.display = "none";
    main.style.display = "block";
    httpGetAsync("/notes", v => UpdateAllContent(v, textArea, todoContainer));
}

function UpdateAllContent(content, textArea, todoContainer) {
    textArea.value = content;
    
    UpdateTodos(content, todoContainer);
}
function UpdateTodos(content, todoContainer) {
    let child = todoContainer.lastElementChild;
    while (child) {
        todoContainer.removeChild(child);
        child = todoContainer.lastElementChild;
    }
    
    const todosRegex = /todo: .*\n[^\[]/gmi;
    const todoRegex = /todo: (.*)\n/i;

    const todos = content.match(todosRegex);
    
    for (const todo of todos) {
        todoContainer.appendChild(
            $e("div", {className: "todoItem"}, 
                [$t(todo.match(todoRegex)[1])]
            )
        );
    }
}

function goToToday(textArea) {
    const textContent = textArea.value.split("\n");
    const dateRegex=/\d{4}-\d{2}-\d{2}/;

    let charCounter = 0;
    for (let i = 0; i < textContent.length; i++) {
        // search for the first date
        const line = textContent[i];
        if (line.match(dateRegex)) {
            const timezone = 10;
            const offset = timezone * 60 * 60 * 1000;
            const dateString = new Date(Date.now() - timezone).toISOString().substr(0, 10);

            // If we're at today, search for the end of today. If we fail, bail
            if (line === dateString) {
                let searchCounter = charCounter + 11;
                for (let j = i + 1; j < textContent.length; j++) {
                    if (textContent[j] === "") {
                        textContent.splice(j, 0, "");
                        textArea.value = textContent.join("\n");
                        textArea.focus();
                        textArea.selectionEnd = searchCounter;
                        return;
                    }
                    searchCounter += textContent[j].length + 1;
                }
                return;
            }

            // Make a new day and send us there
            textContent.splice(i - 1, 0, "");
            textContent.splice(i - 1, 0, dateString);
            textContent.splice(i - 1, 0, "");
            textArea.value = textContent.join("\n");

            textArea.focus();
            textArea.selectionEnd = charCounter + 11;
            return;
        }

        charCounter += line.length + 1;
    }
}

window.onload = () => {
    const login = document.getElementById("login");
    const main = document.getElementById("main");

    const notesTextArea = document.getElementById("notesTextArea");
    const notesButton = document.getElementById("notesButton");

    const loginInput = document.getElementById("loginInput");
    const loginButton = document.getElementById("loginButton");

    const goToTodayButton = document.getElementById("goToToday");

    const todoContainer = document.getElementById("todoContainer");

    // Check if we're logged in
    httpGetAsync("loggedIn", () =>  {
        loadMainContent(login, main, notesTextArea, todoContainer);
    });

    loginButton.onclick = () => {
        httpPostAsync("/login", loginInput.value, () => {
            loadMainContent(login, main, notesTextArea, todoContainer);
        })
    }

    notesButton.onclick = () => {
        httpPostAsync("/notes", notesTextArea.value, () => {console.log("saved!")});
    }

    goToTodayButton.onclick = () => {
        goToToday(notesTextArea);
    }

    notesTextArea.oninput = () => { UpdateTodos(notesTextArea.value, todoContainer) };
    
    // ctrl-s shortcut to save
    document.addEventListener("keydown", (event) => {
        if (event.key === "s" && event.ctrlKey) {
            event.preventDefault();        
            httpPostAsync("/notes", notesTextArea.value, () => {console.log("saved!")});
        }
    });
}