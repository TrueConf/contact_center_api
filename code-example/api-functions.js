// api functions to create call-center

// TrueConf server IP or DNS name
const server = "https://192.168.88.182";

// OAuth2 app ID
const client_id = "5fe82772cfb05ea0cfeba44ed77cb3a50895b552";

// OAuth2 app secret key
const client_secret = "713273efa34440d991e7742ac6dd337622ed737c";

const group_name = "operators";

const conference_div_name = "webrtc-client";
const start_btn_name = "start-call";
const stop_btn_name = "stop-call";

const max_retries_count = 3;
const wait_for_answer = 10; // in seconds
const wait_before_delete = 1; // in seconds

var api_params = {
	"access_token":"", 
	"group_id":0, 
	"conference_id":0,
	"retries_count":0, 
	"prev_operator_id":""
};

var call_timer = null;

var create_conference_timer = null;

var cancel_call = false;

async function messageListener(msg){
	console.log(msg.data);
	switch(msg.data.type){
		case "notSupported":
			showError("WebRTC is not supported.");
			await sleep(deleteConferenceByTimer, wait_before_delete);
			break;
		case "loginFail":
			showError("Login failed.");
			await sleep(deleteConferenceByTimer, wait_before_delete);
			break;
		case "connectionClosed":
			await sleep(deleteConferenceByTimer, wait_before_delete);
			break;
	}
}

async function startCall(){
	try{
		api_params.retries_count = 0;
		api_params.prev_operator_id = "";

		showTimer(wait_for_answer * max_retries_count);

		api_params.access_token = await getAccessToken();
		
		let groups = await getGroups();

		api_params.group_id = getGroupByName(groups, group_name);

		let result_status = await createConference();

		if(!result_status && !cancel_call){
			cancelTimer();
			showError("Can't find free operator. Try later, please.");
		}
		else{
		}
	}
	catch(error){
		cancelTimer();
		showError(error.message);	
	}
}

async function getAccessToken(){
	let url = server + "/oauth2/v1/token";

	let json_data = await getApiData(url, "POST", "x-www-form-urlencoded", 
		"grant_type=client_credentials&client_id=" + client_id + "&client_secret=" + client_secret);

	return json_data.access_token;
}

async function getGroups(){
	let url = server + "/api/v3.1/groups?access_token=" + api_params.access_token;

	let json_data = await getApiData(url, "GET");

	return json_data.groups;
}

async function getOperators(){
	let url = server + "/api/v3.1/groups/" + api_params.group_id + "/users?access_token=" + api_params.access_token;

	let json_data = await getApiData(url, "GET");

	return json_data.users;
}

function getRandomOperator(operators){
	let free_operators = operators.filter(operator => (operator.status == 1) && (operator.id != api_params.prev_operator_id));

	if (free_operators.length == 0){
		return undefined;
	}

	let new_operator_id = Math.floor(Math.random() * free_operators.length);
	return free_operators[new_operator_id].id;
}

async function createConference(){

	if(api_params.retries_count == max_retries_count || cancel_call)
		return false;

	console.log("retries = " + api_params.retries_count);
	let operators = await getOperators();

	let new_operator_id = getRandomOperator(operators);
	if(new_operator_id === undefined){		
		api_params.prev_operator_id = "";
		api_params.retries_count++;
		let result_status = await sleep(createConference, wait_for_answer);
		return result_status;
	}
	else{
		api_params.prev_operator_id = new_operator_id;
		api_params.conference_id = await createConferenceObject();

		let status = await runConference();

		let is_operator_connected = await sleep(checkParticipants, wait_for_answer);

		console.log("connection = " + is_operator_connected);

		if(is_operator_connected)
		{
			let webrtc_url = await getWebrtcUrl();
			showConferenceFrame(webrtc_url);

			showCallBtn(false);

			window.addEventListener("message", messageListener);

			document.getElementById(stop_btn_name).onclick = async function(){
					await sleep(deleteConferenceByTimer, wait_before_delete);
			};

			cancelTimer();

			return true;
		}
		else
		{
			await sleep(deleteConferenceByTimer, wait_before_delete);

			api_params.retries_count++;

			let result_status = await sleep(createConference, wait_for_answer);
			return result_status;
		}
	}
}

async function checkParticipants(){
	let url = server + "/api/v3.1/conferences/" + api_params.conference_id + "/participants?access_token=" + api_params.access_token;
	console.log("check part; " + url);

	let json_data = await getApiData(url, "GET");

	let participants = json_data.participants;

	console.log(participants);

	if (participants.length == 0 || participants.find(participant => participant.id == api_params.prev_operator_id) === undefined){
		return false;
	}
	return true;
}

async function createConferenceObject(){
	let url = server + "/api/v3.1/conferences?access_token=" + api_params.access_token;

	let conference_object = '{ "topic": "site call", "type":0, "auto_invite": 0, "max_participants": 2, "invitations":[{"id":"' +
		 api_params.prev_operator_id + '"}], "schedule":{"type":-1}, "owner":"' + api_params.prev_operator_id + '", "allow_guests":true}';

	let json_data = await getApiData(url, "POST", "json", conference_object);

	return json_data.conference.id;
}

async function runConference(){
	let url = server + "/api/v3.1/conferences/" + api_params.conference_id + "/run/?access_token=" + api_params.access_token;

	let json_data = await getApiData(url, "POST");
	return json_data.state;
}

async function deleteConferenceByTimer(){
	if(api_params.conference_id == 0)
		return 0;

	console.log("try to deleteConferenceByTimer");
	deleteConferenceFrame();
	showCallBtn();

	let state = await stopConference();

	let id = await deleteConference();

	api_params.conference_id = 0;

	window.removeEventListener("message", messageListener);

	return id;
}

async function stopConference(){
	let url = server + "/api/v3.1/conferences/" + api_params.conference_id + "/stop/?access_token=" + api_params.access_token;
	console.log("stop = " + url);

	let json_data = await getApiData(url, "POST");

	return json_data.state;
}

async function deleteConference(){
	let url = server + "/api/v3.1/conferences/" + api_params.conference_id + "/?access_token=" + api_params.access_token;

	let json_data = await getApiData(url, "DELETE");
	return json_data.id;
}

async function getWebrtcUrl(){
	let url = server + "/api/v3.1/software/clients?call_id=" + api_params.conference_id;
	let json_data = await getApiData(url, "GET");
	let webRTCdata = json_data.clients.find(client => client.platform == "webrtc");
	if (webRTCdata.length == 0)
		throw new Error("Can't find ulr for WebRTC client. Check WebRTC licence.");
	return webRTCdata.web_url;
}

async function sleep (fn, seconds) {
  return new Promise((resolve) => {
    create_conference_timer = setTimeout(() => resolve(fn()), seconds * 1000);
	console.log("sleep func " + seconds);
  })
}

async function getApiData(url, request_type, body_encoding = "json", body_content = ""){
	let response;

	if (request_type == "GET"){ 
		response = await fetch(url);
	}
	else{ 
		response = await fetch(url, {
			method: request_type,
			headers: {
				"Content-Type": "application/" + body_encoding
			},
			body: body_content
		});
	}

	let json_data = await getJsonResponse(response);

	return json_data;
}

async function getJsonResponse(response){
	if (response.ok){
		let json_data = await response.json();
		checkApiError(json_data);
		return json_data;
	}
	else{
		throw new Error("Error while fetch data " + response.status + ", message = '" + response.message + "'");
	}
}

function checkApiError(json_data){
	if("error" in json_data){
		console.log(json_data);
		throw new Error("Request returned error '" + json_data.error + "' with message '" + json_data.error_description + "'");
	}
}

function getGroupByName(groups, group_name){
	for (var i = 0; i < groups.length; i++) {
		if (groups[i].display_name == group_name)
			return groups[i].id;
	}
	if (i == groups.length){
		throw new Error("Can't find 'operators' group.");
	}
}

function showConferenceFrame(webrtc_url){
	let conference_div = document.getElementById(conference_div_name);
	let conference_frame = document.createElement("iframe");
	conference_frame.src = webrtc_url;
	conference_frame.setAttribute("allow", "microphone; camera; autoplay");
	conference_frame.setAttribute("allowfullscreen", true);
	conference_frame.style.width = "720px";
	conference_frame.style.height = "480px";
	conference_div.appendChild(conference_frame);
	conference_div.style.display = "block";
}

function deleteConferenceFrame(){
	let conference_div = document.getElementById(conference_div_name);
	while (conference_div.firstChild) {
	    conference_div.firstChild.remove();
	}
}

async function cancelTimer(){
	if(call_timer != null){
		clearInterval(call_timer);
	}
	if(create_conference_timer != null){
		clearTimeout(create_conference_timer);
	}
	setTimerBlockVisibility(false);
	cancel_call = true;
};

function showTimer(seconds_remaining){
	let timer_value = document.getElementById("timer-value");
	timer_value.innerHTML = seconds_remaining;
	setTimerBlockVisibility();
	cancel_call = false;
	document.getElementById("cancel-call").onclick = async function(){
		cancelTimer();
		await sleep(deleteConferenceByTimer, wait_before_delete);
	}
	call_timer = setInterval(function(){
		if(seconds_remaining <= 0){
			cancelTimer();
			showError("Can't find free operator. Try later, please.");
		}
		timer_value.innerHTML = seconds_remaining--;
	}, 1000);
}

// true - show call button
function showCallBtn(show_call_btn = true){
	document.getElementById(start_btn_name).style.display = show_call_btn ? "block" : "none";
	document.getElementById(stop_btn_name).style.display = show_call_btn ? "none" : "block";
}

function showError(error){
	document.getElementById("error-message").innerHTML = error;
	document.getElementById("error-block").style.display = "block";
	document.getElementById("call-buttons").style.display = "none";
}

function hideError(){
	document.getElementById("error-block").style.display = "none";
	document.getElementById("call-buttons").style.display = "block";
}

function setTimerBlockVisibility(show = true){
	document.getElementById("timer-block").style.display = show ? "block" : "none";
	document.getElementById("call-buttons").style.display = show ? "none" : "block";
}
