import {useState} from "react";
import {invoke} from "@tauri-apps/api/tauri";
import "./App.css";
import {Redirect, Route, Switch} from "react-router-dom";
import Home from "./pages/Home/index.jsx";
import Login from "./pages/Login/index.jsx";

function App() {
    const [greetMsg, setGreetMsg] = useState("");
    const [name, setName] = useState("");

    async function greet() {
        setGreetMsg(await invoke("greet", {name}));
    }

    return (
        <div>
            <Switch>
                <Route path="/login" component={Login}></Route>
                <Route path="/home" component={Home}></Route>
                <Redirect path="/" to="/login"/>
            </Switch>
        </div>
    );
}

export default App;
