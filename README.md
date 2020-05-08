# How to make video contact center using TrueConf Server API
____
## Table of Contents
1. [Pre-configuring TrueConf Server](#pre-configuring-trueconf-server)
1. [Step 1. Obtaining the list of operators](#step-1-obtaining-the-list-of-operators)
1. [Step 2. Selecting an available operator](#step-2-selecting-an-available-operator)
1. [Step 3. Creating a conference](#step-3-creating-a-conference)
1. [Step 4. Starting a conference](#step-4-starting-a-conference)
1. [Step 5. Checking the operator’s status](#step-5-checking-the-operators-status)
1. [Step 6. Obtaining the guest link](#step-6-obtaining-the-guest-link)
1. [Step 7. Embedding the widget on the website](#step-7-embedding-the-widget-on-the-website)
1. [Step 8. Ending the call](#step-8-ending-the-call)
1. [Additional settings](#additional-settings)
____

TrueConf doesn’t only [provide you with a comfortable and scalable video conferencing system](https://trueconf.com/blog/knowledge-base/get-video-conferencing-system-15-minutes.html), but also enables you to expand its range with the help of [TrueConf Server API](https://developers.trueconf.com/api/server/).

This article covers the detailed algorithm of video contact center deployment based on TrueConf Server. The main idea is to connect a website [guest](https://trueconf.com/blog/wiki/online-user-guest) and an available operator in a private [video conference](https://trueconf.com/what-is-video-conferencing.html). This method uses [WebRTC technology](https://trueconf.com/blog/reviews-comparisons/which-browsers-support-webrtc.html).

:warning: ***WARNING!***
> **The given algorithm and code example is not intended for use in an operational environment. Being deliberately simple, this example is tailored to be used without installing additional software so you can get easily acquainted with TrueConf Server API.**

Both users of [TrueConf Server](https://trueconf.com/products/server/video-conferencing-server.html) and [TrueConf Server Free](https://trueconf.com/products/tcsf/trueconf-server-free.html) can check the working capacity of the described scheme.

As TrueConf Server Free allows only one simultaneous video conference, we do not recommend using it as a full-fledged platform for the video contact center deployment.

## Pre-configuring TrueConf Server

1. Create a separate group named **Operators** in [TrueConf Server control panel](https://docs.trueconf.com/server/en/admin/web-config#groups-tab) and add users who will accept calls.
1. Configure the [HTTPS connection](https://trueconf.com/blog/knowledge-base/adjust-https-trueconf-server.html) for using WebRTC widget and performing TrueConf Server API requests.

Requests to the TrueConf Server API are used to perform the actions described in the algorithm.

## Step 1. Obtaining the list of operators

[Obtain the list of all users](https://developers.trueconf.com/api/server/#api-Groups_Users-GetUserList) in the **Operators** group. It is better to do this at each iteration of the algorithm, so you will not miss the moment of adding a new operator to the group.

## Step 2. Selecting an available operator

1. Create the list of online operators (objects [ObjectUser](https://developers.trueconf.com/api/server/#api-Objects-User) in [the list](#step-1-obtaining-the-list-of-operators) will have `status = 1`).
1. Randomly choose one operator from the list. [TrueConf ID](https://trueconf.com/blog/wiki/trueconf-id) of the selected user must differ from the one you specified in [step 5](#step-5-checking-the-operators-status) in the previous iteration.
1. If there is no available operator, return to [step 1](#step-1-obtaining-the-list-of-operators) after a short period of time (for example, 10 seconds)
1. Repeat attempts to find an available operator the required number of times (e.g. 3 times) or within a specified period of time (e.g. 30 seconds).

## Step 3. Creating a conference

[Create a new conference](https://developers.trueconf.com/api/server/#api-Conferences-CreateConference) with the following parameters:

* [owner](https://trueconf.com/blog/wiki/owner) and [participant](https://trueconf.com/blog/wiki/conference-participant) - set the [selected operator](#step-2-selecting-an-available-operator) in both entry fields.
* number of participants - 2.
* conference schedule - [virtual room](https://trueconf.com/blog/wiki/virtual-room) (without schedule).
* conference type - public, so the website guest can connect via WebRTC application.
* [conference mode](https://trueconf.com/blog/knowledge-base/the-ultimate-guide-to-conference-modes.html) - symmetric.

## Step 4. Starting a conference

After you've created the conference, [start it](https://developers.trueconf.com/api/server/#api-Conferences-RunConference). Operator will automatically receive an invitation as a participant.

## Step 5. Checking the operator’s status

Some time after the [conference starts](#step-4-starting-a-conference) (e.g., 10 seconds), [check](https://developers.trueconf.com/api/server/#api-Conferences_Participants-GetParticipantList) whether the selected operator is connected to the conference. If the operator didn’t accept the call, complete the following steps:

1. Write the operator’s TrueConf ID.
1. [Stop the conference](https://developers.trueconf.com/api/server/#api-Conferences-StopConference).
1. [Delete the conference](https://developers.trueconf.com/api/server/#api-Conferences-DeleteConference).
1. Return to the [step 1](#step-1-obtaining-the-list-of-operators).

## Step 6. Obtaining the guest link

Obtain the guest link for the [created conference](#step-3-creating-a-conference) from the [client applications list](https://developers.trueconf.com/api/server/#api-Software_Clients-GetClientList) to connect via WebRTC widget.

## Step 7. Embedding the widget on the website

Create a widget to embed it on the website in a form of HTML element `<iframe>` by setting the guest link as a path for downloading content.

## Step 8. Ending the call

You can track the ending of a call with the help of [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) technology (widget will send the  `connectionClosed` message). When the call ends, do the following steps:

1. Delete the [embedded widget](#step-7-embedding-the-widget-on-the-website).
1. [Stop the video conference](https://developers.trueconf.com/api/server/#api-Conferences-StopConference).
1. [Delete the video conference](https://developers.trueconf.com/api/server/#api-Conferences-DeleteConference) from the server.

## Additional settings

If necessary, you can forbid the guests to use some [features of WebRTC client](https://trueconf.com/blog/knowledge-base/embedding-trueconf-video-conferencing-into-your-website.html#How_to_customize_conference_webpage) (e.g. content sharing).

:point_right: ***Tip*** 
> To save the history of communication between operators and customers, you can [set up automatic recording of video calls](https://trueconf.com/blog/knowledge-base/how-to-record-video-conference.html#How_to_record_video_conferences_on_TrueConf_Server_side).

You can get acquainted with the example of HTML website and the described algorithm on GitHub.
____
[:arrow_up:Table of Contents](#table-of-contents)
___