/* ==== config ==== */
const RESET_HOUR = 3;
const FIXED_TASKS = {
    userA: ["Pas d'alcool", "Lire 10 pages", "Boire 3L d’eau", "Séance de sport en intérieur", "Séance de sport en extérieur", "Travailler", "Manger Sainement"],
    userB: ["Pas d'alcool", "Lire 10 pages", "Boire 3L d’eau", "Séance de sport en intérieur", "Séance de sport en extérieur", "Travailler", "Manger Sainement"]
};

const VACATION_TASKS = {
    userA: ["Lire 1 livre", "Envoyer 5 CV", "-3h de téléphone","Pas de grignotage"],
    userB: ["Cuisiner 4 repas du soir", "Lancer PrepMyFuture", "-3h de téléphone", "8h de sommeil minimum"]
};


/* ==== helpers time ==== */
function now(){ return new Date(); }

function isoDateYMD(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
}

function shouldReset(lastResetISO){
    const current = now();
    const todayISO = isoDateYMD(current);
    if (!lastResetISO) return current.getHours() >= RESET_HOUR;
    if (lastResetISO < todayISO && current.getHours() >= RESET_HOUR) return true;
    return false;
}

/* ==== storage ==== */
const KEY_LAST_RESET = "challenge_last_reset_iso";
const KEY_STATE = "challenge_state_v1";

function loadState(){
    const raw = localStorage.getItem(KEY_STATE);
    if(!raw){
        return {
            fixed: {
                userA: FIXED_TASKS.userA.map(()=>false),
                userB: FIXED_TASKS.userB.map(()=>false)
            },
            todos: { userA:[], userB:[] },
            vacation: { 
                userA: VACATION_TASKS.userA.map(()=>false),
                userB: VACATION_TASKS.userB.map(()=>false)
            }
        };
    }
    try { 
        const state = JSON.parse(raw); 
        // au cas où vacation n'existe pas dans un ancien state
        if(!state.vacation){
            state.vacation = {
                userA: VACATION_TASKS.userA.map(()=>false),
                userB: VACATION_TASKS.userB.map(()=>false)
            };
        }
        return state;
    }
    catch(e){ console.error(e); return loadState(); }
}



function saveState(state){ localStorage.setItem(KEY_STATE, JSON.stringify(state)); }

function performDailyResetIfNeeded(state){
    const lastReset = localStorage.getItem(KEY_LAST_RESET);
    if(shouldReset(lastReset)){
        state.fixed.userA = FIXED_TASKS.userA.map(()=>false);
        state.fixed.userB = FIXED_TASKS.userB.map(()=>false);
        state.todos.userA = state.todos.userA.filter(t=>!t.done);
        state.todos.userB = state.todos.userB.filter(t=>!t.done);
        localStorage.setItem(KEY_LAST_RESET, isoDateYMD(now()));
        saveState(state);
    }
}

/* ==== rendering ==== */
function renderFixedList(user, containerId, state){
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    FIXED_TASKS[user].forEach((label, idx)=>{
        const li = document.createElement("li");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!state.fixed[user][idx];
        cb.addEventListener("change", ()=>{
            state.fixed[user][idx] = cb.checked;
            saveState(state);
        });
        const span = document.createElement("span");
        span.textContent = label;
        li.appendChild(cb);
        li.appendChild(span);
        container.appendChild(li);
    });
}

function renderTodoList(user, listId, state){
    const ul = document.getElementById(listId);
    ul.innerHTML = "";
    state.todos[user].forEach(item=>{
        const li = document.createElement("li");
        li.dataset.id = item.id;
        if(item.done) li.classList.add("completed");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = item.done;
        cb.addEventListener("change", ()=>{
            item.done = cb.checked;
            saveState(state);
            renderAll(state);
        });

        const span = document.createElement("span");
        span.textContent = item.text;

        const del = document.createElement("button");
        del.textContent = "×";               // joli symbole
        del.title = "Supprimer";
        del.classList.add("delete-btn");     // ← important : ajoute la classe

        del.addEventListener("click", ()=>{
            state.todos[user] = state.todos[user].filter(t=>t.id!==item.id);
            saveState(state);
            renderAll(state);
        });

        li.appendChild(cb);
        li.appendChild(span);
        li.appendChild(del);
        ul.appendChild(li);
    });
}

function addTodo(user, text, state){
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    state.todos[user].push({id, text, done:false, createdIso: isoDateYMD(now())});
    saveState(state);
    renderAll(state);
}

function updateVacationProgress(user, state) {
    const progressEl = document.getElementById(`progress-${user}`);
    const tasksToCount = [0,1]; // indices des tâches qui comptent pour la barre
    const completed = tasksToCount.filter(idx => state.vacation[user][idx]).length;
    const percent = tasksToCount.length === 0 ? 0 : (completed / tasksToCount.length) * 100;
    progressEl.style.width = percent + "%";
}



function renderAll(state){
    renderFixedList("userA","fixed-userA",state);
    renderFixedList("userB","fixed-userB",state);
    renderTodoList("userA","todo-list-userA",state);
    renderTodoList("userB","todo-list-userB",state);
    renderVacationTasks("userA", state);
    renderVacationTasks("userB", state);
}



function renderVacationTasks(user, state) {
    const ul = document.getElementById(`vacation-${user}`);
    ul.innerHTML = "";
    VACATION_TASKS[user].forEach((task, idx) => {
        const li = document.createElement("li");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = state.vacation[user][idx];

        cb.addEventListener("change", () => {
            state.vacation[user][idx] = cb.checked;
            saveState(state);
            updateVacationProgress(user, state);
        });

        const span = document.createElement("span");
        span.textContent = task;

        li.appendChild(cb);
        li.appendChild(span);
        ul.appendChild(li);
    });

    updateVacationProgress(user, state);
}



/* ==== forms ==== */
function wireForms(state){
    document.getElementById("todo-form-userA").addEventListener("submit", e=>{
        e.preventDefault();
        const txt = e.target.todo.value.trim();
        if(!txt) return;
        addTodo("userA", txt, state);
        e.target.reset();
    });
    document.getElementById("todo-form-userB").addEventListener("submit", e=>{
        e.preventDefault();
        const txt = e.target.todo.value.trim();
        if(!txt) return;
        addTodo("userB", txt, state);
        e.target.reset();
    });
}

/* ==== init ==== */
document.addEventListener("DOMContentLoaded", ()=>{
    const state = loadState();
    performDailyResetIfNeeded(state);
    wireForms(state);
    renderAll(state);

    renderVacationTasks("userA", state);
    renderVacationTasks("userB", state);


    // mettre à jour la barre après avoir rendu les tâches
    updateVacationProgress("userA", state);
    updateVacationProgress("userB", state);

});
