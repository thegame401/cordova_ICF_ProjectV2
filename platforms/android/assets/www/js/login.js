var isOnlineMode;

var db;

var currentQTID;
var currentQID;
var currentKor;
var maxKor;

var cid = "";
var name = "";

var sectionQTID = ["00060", "00061", "00062", "00063", "00064", "00065", "00066", "00067", "00068", "00069"];
var sectionQID = [];
var questionUI = "";

var modeBindData = false;

var isAccess;
//========================================================
$(document).on('pageinit', '#login', function () {
    document.addEventListener("deviceready", queryCheckingInterNet, false);
    $("#loginButton").click(function () {
        if (isOnlineMode) {
            $.ajax({
                url: "http://newtestnew.azurewebsites.net/servicecontrol/service.svc/login?username=" + $("#userName").val() + "&password=" + $("#passWord").val() + "&src=00",
                dataType: "jsonp",
                crossDomain: true
            })
            .then(function (response) {
                isAccess = false;
                var a = JSON.parse(response);
                //console.log(a);
                if (a.Status == "OK") {
                    var roleData = a.data.Role;
                    for (var i = 0; i < roleData.length ; i++) {
                        if (roleData[i].RoleID === "8cb92692-976e-462a-be04-306fc3d0983f" || roleData[i].RoleID === "f7c79584-3880-40d0-a1c2-45bcf355f800") {
                            //Can Access
                            isAccess = true;
                            break;
                        }
                    }
                    if (isAccess === true) {
                        db.transaction(function (tx) {
                            tx.executeSql('INSERT INTO User VALUES ("' + $("#userName").val() + '","' + a.data.HostID + '","' + a.data.HostName + '","' + a.data.Name + '","' + a.data.StaffID + '")');
                        }, errorCB,
                            function () {
                                //Success Function Query Person
                                localStorage.setItem("hostID", a.data.HostID);
                                localStorage.setItem("staffID", a.data.StaffID);
                                $.mobile.changePage("#home", { transition: "slide" });
                            }
                        );
                    }
                }
                else {
                    alert("รหัสไม่ถูกต้อง");
                }
            });
        }
        else {
            //Locking
            alert("โปรดต่อ Internet เพื่อ Login");
        }
    });
});


function queryCheckingInterNet() {
    document.addEventListener("backbutton", function (e) {
        if ($.mobile.activePage.is('#home')) {
            e.preventDefault();
            //navigator.app.exitApp();
        }
        else {
            navigator.app.backHistory()
        }
    }, false);


    db = window.openDatabase("Database", "1.0", "Cordova Demo", 2 * 1024);
    db.transaction(function (tx) {
        //Create Table
        tx.executeSql('CREATE TABLE IF NOT EXISTS User (User VARCHAR(50),HostID VARCHAR(50),HostName VARCHAR(127), Name VARCHAR(127),Staff_id VARCHAR(127), PRIMARY KEY(User))');
    }, errorCB,
       function () {
           isOnlineMode = true;
           db.transaction(checkingQueryStaff, errorCB);
           $('#ModeOn').empty();
       });
}

function checkingQueryStaff(tx) {
    tx.executeSql("SELECT * FROM User", [],
        function (tx, results) {
            //Login with current user
            isLock = false;
            if (results.rows.length == 1) {
                //Success Function Query Person
                isAccess = true;
                localStorage.setItem("hostID", results.rows[0].HostID);
                localStorage.setItem("staffID", results.rows[0].Staff_id);
                $.mobile.changePage("#home", { transition: "slide" });
            }
            else {
                if (isOnlineMode === false) {
                    isAccess = false;
                    alert("โปรดต่อ Internet เพื่อ Login");
                    //isLock = true;
                }
            }
        }
        , errorCB);
}

$(document).on('pageinit', '#home', function () {
    document.addEventListener("deviceready", homeQueryPerson, false);
    $('#dataTableSeatch').on('click', 'li', function () {
        cid = $(this).attr('id');
        $.mobile.changePage("#profile", { transition: "slide" });
    });
});

$(document).on('pagebeforeshow', '#home', function () {
    if(isAccess == false)
    {
        alert("ไม่มีการ Login");
        $.mobile.changePage("#login", { transition: "slide" });
    }
});

$(document).on('pagebeforeshow', '#profile', function (e) {
    //Remove Table Tag
    $('#personProfile thead').empty();
    $('#personProfile tbody').empty();
    $('#personicfRecord thead').empty();
    $('#personicfRecord tbody').empty();
    $("#headerProfile").empty();
    db.transaction(queryShownPersonProfile, errorCB);
    db.transaction(querySummaryQuestionaireData ,errorCB);
});

$(document).on('pagebeforeshow', '#icf', function () {
   
    $("#headericf").empty();
    $('#headericf').append('กรอกข้อมูล ICF : ' + name);

    $(".ui-slider-input").hide();
    $("#slider-2 input").remove();
    $(".ui-slider-handle").remove();
    $('.ui-slider-track').css('margin', '0 15px 0 15px').css('pointer-events', 'none');

    currentKor = 1;
    currentQTID = 0;
    currentQID = 0;

    $("#currentQ").empty();
    $("#currentQ").append(currentKor.toString());

    getCountQData();
    getquestionDataByQTID(currentQTID, 0);
});

//===========================================================
function homeQueryPerson() {
    db = window.openDatabase("Database", "1.0", "Cordova Demo", 2 * 1024 * 1024);
    if (navigator.onLine) {
        isOnlineMode = true;
        //Upload Data, DROP Table All if success
        db.transaction(function (tx) {
            //Drop Table
            tx.executeSql('DROP TABLE IF EXISTS Person');
            tx.executeSql('DROP TABLE IF EXISTS Questionaire');
            tx.executeSql('DROP TABLE IF EXISTS Answer');

            //Create Table
            tx.executeSql('CREATE TABLE IF NOT EXISTS Person (CID VARCHAR(13) PRIMARY KEY, FirstName VARCHAR(255), LastName VARCHAR(255), Address VARCHAR(255), HostID VARCHAR(15), HostName VARCHAR(255),pic VARCHAR(255), dob VARCHAR(255))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS QRecord (CID VARCHAR(13), QTID VARCHAR(15), QID VARCHAR(15), AID VARCHAR(15), Note VARCHAR(155), ISSync int, PRIMARY KEY (CID,QTID,QID,AID))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Questionaire (QID VARCHAR(15), QDESC VARCHAR(255), QTID VARCHAR(15), AnswerGroupID VARCHAR(15), IUControl VARCHAR(15), PRIMARY KEY(QID,QTID))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Answer (QID VARCHAR(15),QTID VARCHAR(15),AID VARCHAR(15), ADesc VARCHAR(255), Value VARCHAR(10), PRIMARY KEY(QID,QTID,AID))');
        }, errorCB,
        function () {
            startAjaxLoader();
            //Success Function Load Person Data
            $.ajax({
                url: "http://newtestnew.azurewebsites.net/ServiceControl/service.svc/getSearchPerson?host=" + localStorage.getItem("hostID"),
                dataType: "jsonp",
                crossDomain: true
            })
            .then(function (response) {
                db.transaction(function (tx) {
                    var a = JSON.parse(response);
                    for (var i = 0; i < a.data.length ; i++) {
                        tx.executeSql('INSERT INTO Person VALUES ("' + a.data[i].CID + '","' + a.data[i].firstname + '","' + a.data[i].lastname + '","","' + localStorage.getItem("hostID") + '","","' + a.data[i].PIC + '","")');
                    }
                }, errorCB, function () {
                    initQuestionDownload(0);
                });
            });
        });
    }
    else {
        isOnlineMode = false;
        //Offline
        db.transaction(queryShownPerson, errorCB);
    }
}

function initQuestionDownload(index) {
    $.ajax({
        url: "http://newtestnew.azurewebsites.net/ServiceControl/service.svc/getQData?qtid=" + sectionQTID[index] + "&descOrder=true&getMapOnly=true&src=00",
        dataType: "jsonp",
        crossDomain: true
    })
    .then(function (response) {
        db.transaction(function (tx) {
            var msg = JSON.parse(response);
            //console.log(msg);
            for (var i = 0; i < msg.length; i++) {
                tx.executeSql('INSERT INTO Questionaire VALUES ("' + msg[i].QID + '","' + msg[i].text + '","' + msg[i].QTID + '","","' + msg[i].QUI + '")');
                var ans = msg[i].answer;
                for (var j = 0; j < ans.length; j++) {
                    tx.executeSql('INSERT INTO Answer VALUES ("' + msg[i].QID + '","' + msg[i].QTID + '","' + ans[j].id + '","' + ans[j].text + '","' + ans[j].value + '")');
                }
            }
            index++;
            if (index < sectionQTID.length) {
                initQuestionDownload(index);
            }
            else {
                db.transaction(queryShownPerson, errorCB);
            }
        }, errorCB, function () {
            
        });
    });
}

function getquestionDataByQTID(qtid, index) {
    sectionQID = [];
   
    db.transaction(function (tx) {
        tx.executeSql("SELECT DISTINCT QID FROM Questionaire WHERE Questionaire.QTID = '" + sectionQTID[qtid] + "'", [],
            (function (tx, results) {
                for (var i = 0; i < results.rows.length; i++) {
                    sectionQID.push(results.rows[i].QID);
                }
            }), errorCB);
    }, errorCB, (
        function () {
            if (index == 1) {
                currentQID = sectionQID.length - 1;
            }
            else if (index == 2) {
                currentQID = 0;
            }
            db.transaction(queryShownQuestionaire, errorCB);
        }
    )
    );
}

function getCountQData()
{
    db.transaction(function (tx) {
        tx.executeSql("SELECT QID FROM Questionaire", [],
            (function (tx, results) {
                maxKor = results.rows.length;
            }), errorCB);
    }, errorCB, (
        function () {
            $("#maxQ").empty();
            $("#maxQ").append(maxKor.toString());
        }
    )
    );
}

function prevQuestion() {
    //============
    // $('#prev').unbind('click');
    $("#prev").attr("onclick", "alert('โปรดอย่า Spam ปุ่มครับ');");
    setTimeout(function () { $("#prev").attr("onclick", "prevQuestion();"); }, 500);
    //============

    if (currentKor != 1) {
        currentKor--;
        recordQuestionData(0);
    }
    else {
        alert("ไม่มีข้อก่อนหน้า");
    }

}

function nextQuestion() {
    //$("#next").attr("onclick", "alert('โปรดอย่า Spam ปุ่มครับ');").button("refresh");
    //setTimeout(function () { $("#next").attr("onclick", "nextQuestion();").button("refresh"); }, 500);
    $("#next").attr("onclick", "alert('โปรดอย่า Spam ปุ่มครับ');");
    setTimeout(function () { $("#next").attr("onclick", "nextQuestion();"); }, 500);
    if (currentKor != maxKor) {
        currentKor++;
        recordQuestionData(1);
    }
    else {
        recordQuestionData(2);
    }
}


function recordQuestionData(param) {
    var dataAns = [];
    var otherString = "";
    var isTick = false;
    if (questionUI == "20010" || questionUI == "20030" || questionUI == "20019" || questionUI == "20039") {
        //Radio
        $("input[name=radio-01]:checked").each(function () {
            var val = $(this).val()
            if (val == "99999") {
                isTick = true;
                otherString = $('#otherTxt').val();
            }
            else {
                dataAns.push($(this).val());
            }
        });
    }
    else if (questionUI == "20020" || questionUI == "20029") {
        //CheckboxList
        $("input[name=checkbox-01]:checked").each(function () {
            var id = $(this).attr('id');
            if (id == "99999") {
                isTick = true;
                otherString = $('#otherTxt').val();
            }
            else {
                dataAns.push(id);
            }
        });
    }
    else if (questionUI == "10040" || questionUI == "10049")
    {
        $("input[type=number]").each(function () {
            if ($(this).val() != "" && $(this).attr("id") != "slider-2") {
                var count = ($(this).val().indexOf('.'));
                var count2 = ($(this).val().indexOf('-'));
                //console.log($(this).val());
                //console.log(count);
                //console.log(count2);
            }
        });
    }
    db.transaction(function (tx) {
        if (questionUI == "20010" || questionUI == "20030" || questionUI == "20019" || questionUI == "20039") {
            //Radio
            if (isTick) {
                //=============Other==================
                if (modeBindData) {
                    tx.executeSql('UPDATE QRecord SET AID ="99999", Note = "' + otherString + '" WHERE CID = "' + cid + '" AND QTID = "' + sectionQTID[currentQTID] + '" AND QID = "' + sectionQID[currentQID] + '"');
                    console.log('updateRadioOther');
                }
                else {
                    
                    tx.executeSql('INSERT INTO QRecord VALUES ("' + cid + '","' + sectionQTID[currentQTID] + '","' + sectionQID[currentQID] + '","99999","' + otherString + '",0)');
                    console.log('insertRadioOther');
                }
            }
            else
            {
                if (modeBindData) {
                    //มีการ bind data ให้ update
                    
                    tx.executeSql('UPDATE QRecord SET AID ="' + dataAns[0] + '" WHERE CID = "' + cid + '" AND QTID = "' + sectionQTID[currentQTID] + '" AND QID = "' + sectionQID[currentQID] + '"');
                    console.log('UpdateRadio');
                }
                else {
                    
                    tx.executeSql('INSERT INTO QRecord VALUES ("' + cid + '","' + sectionQTID[currentQTID] + '","' + sectionQID[currentQID] + '","' + dataAns[0] + '","",0)');
                    console.log('insertRadio');
                }
            } 
        }
        else if (questionUI == "20020" || questionUI == "20029") {
            //CheckboxList
            //Delete
            tx.executeSql('DELETE FROM QRecord WHERE CID = "' + cid + '" AND QTID = "' + sectionQTID[currentQTID] + '" AND QID = "' + sectionQID[currentQID] + '"');
            //Insert
            for (var i = 0; i < dataAns.length; i++) {
                tx.executeSql('INSERT INTO QRecord VALUES ("' + cid + '","' + sectionQTID[currentQTID] + '","' + sectionQID[currentQID] + '","' + dataAns[i] + '","",0)');
            }
            //=============Other==================
            if (isTick) {
                tx.executeSql('INSERT INTO QRecord VALUES ("' + cid + '","' + sectionQTID[currentQTID] + '","' + sectionQID[currentQID] + '","99999","' + otherString + '",0)');
            }
        }
        else if (questionUI == "10040" || questionUI == "10049") {
            tx.executeSql('DELETE FROM QRecord WHERE CID = "' + cid + '" AND QTID = "' + sectionQTID[currentQTID] + '" AND QID = "' + sectionQID[currentQID] + '"');
            $("input[type=number]").each(function () {
                if ($(this).val() != "" && $(this).attr("id") != "slider-2") {
                    tx.executeSql('INSERT INTO QRecord VALUES ("' + cid + '","' + sectionQTID[currentQTID] + '","' + sectionQID[currentQID] + '","' + $(this).attr("id") + '","' + $(this).val() + '",0)');
                }
            });
        }
    }, errorCB, (
        //Success Function
        function () {
            //=========Checking Status For Disable===========
            $("#slider-2").val((currentKor * 100) / maxKor).slider("refresh");
            $("#currentQ").empty();
            $("#currentQ").append(currentKor.toString());
            //=================================================
            if (param == 0) {
                if (currentQID == 0) {
                    currentQTID--;
                    getquestionDataByQTID(currentQTID, 1);
                }
                else {
                    currentQID--;
                    db.transaction(queryShownQuestionaire, errorCB);
                }
            }
            else if (param == 1) {
                if (currentQID == sectionQID.length - 1) {
                    currentQTID++;
                    getquestionDataByQTID(currentQTID, 2);
                }
                else {
                    currentQID++;
                    db.transaction(queryShownQuestionaire, errorCB);
                }
            }
            else
            {
                alert("กรอกข้อมูล ICF ครบทุกข้อแล้ว");
            }
        }
    ));
}

function successCB() {
    //if complete
}

//shown error code
function errorCB(err) {
    alert("Error processing SQL: " + err.code);
    //Reporting Error
}

function queryShownPerson(tx) {
    tx.executeSql("SELECT * FROM Person WHERE HostID = '" + localStorage.getItem("hostID") + "' LIMIT 10", [], showPersonList, errorCB);
}

function queryShownPersonProfile(tx) {
    tx.executeSql("SELECT * FROM Person WHERE CID = '" + cid + "'", [], showPersonProfile, errorCB);
}

function queryShownQuestionaire(tx) {
    //Query for question
    tx.executeSql("SELECT * FROM Questionaire INNER JOIN Answer ON (Questionaire.QID = Answer.QID AND Questionaire.QTID = Answer.QTID) WHERE Questionaire.QTID = '" + sectionQTID[currentQTID] + "' AND Questionaire.QID = '" + sectionQID[currentQID] + "'", [], showQuestionaire, errorCB);
}

function querySummaryQuestionaireData(tx)
{
    tx.executeSql("SELECT * FROM QRecord " 
      + " JOIN Questionaire ON QRecord.QTID = Questionaire.QTID AND QRecord.QID = Questionaire.QID "
      + " JOIN Answer ON QRecord.AID = Answer.AID AND QRecord.QID = Answer.QID AND QRecord.QTID = Answer.QTID WHERE CID = '" + cid + "' ORDER BY Questionaire.QTID,Questionaire.QID", [], showSummaryQuestionaireData, errorCB);
}

function showSummaryQuestionaireData(tx, results)
{
    var tempAppend = "";
    //$("#personicfRecord").append("<thead><tr><th width='40%'></th><th width='60%'></th></tr></thead>");
    tempAppend = "<thead><tr><th width='40%'></th><th width='60%'></th></tr></thead>";
    //console.log(results);
    if (results.rows.length == 0)
    {
        tempAppend += "<tbody><tr><td colspan=2>ไม่มีการตอบแบบฟอร์ม ICF ในอุปกรณ์นี้</td></tr></tbody>";
        $("#personicfRecord").append(tempAppend);
    }
    else
    {
        var beforeQID;
        var tempData = "";
        for (var i = 0 ; i < results.rows.length; i++) {
            if (beforeQID === results.rows[i].QID) {
                //คำถามเดิม
                if (results.rows[i].AID != "99999")
                {
                    tempData += "<tr><td></td><td>" + results.rows[i].ADesc + "</td></tr>";
                }
                else
                {
                    tempData += "<tr><td></td><td>อื่นๆ - " + results.rows[i].Note + "</td></tr>";
                }
            }
            else {
                //คำถามใหม่
                if (results.rows[i].AID != "99999") {
                    tempData += "<tr><td>" + results.rows[i].QDESC + "</td><td>" + results.rows[i].ADesc + "</td></tr>";
                }
                else
                {
                    tempData += "<tr><td>" + results.rows[i].QDESC + "</td><td>อื่นๆ - " + results.rows[i].Note + "</td></tr>";
                }
                
            }
            beforeQID = results.rows[i].QID;
        }
        tempAppend = tempAppend + "<tbody>" + tempData + "</tbody>";
        $("#personicfRecord").append(tempAppend);
    }
    
}

function showPersonList(tx, results) {
    var len = results.rows.length;
    for (var i = 0 ; i < len; i++) {
        var pic = "";
        if (isOnlineMode == true) {
            if (results.rows[i].pic === "") {
                pic = "img/avatar-placeholder.png";
            }
            else {
                pic = results.rows[i].pic;
            }
        }
        else {
            pic = "img/avatar-placeholder.png";
        }
        $("#dataTableSeatch").append("<li class='ui-li-has-thumb' id='" + results.rows[i].CID + "'><a class='ui-btn waves-effect waves-button waves-effect waves-button' data-transition='slide'><img class='ui-thumbnail ui-thumbnail-circular' src='" + pic + "'><h2>"
                + results.rows[i].FirstName + " " + results.rows[i].LastName + "</h2><p>" + results.rows[i].CID + "</p></a></li>");
    }
    $("#dataTableSeatch").listview('refresh');
    stopAjaxLoader();
}

function showPersonProfile(tx, results) {
    var dob = "";
    var age = "";
    var add = "";
    if (results.rows[0].dob === "")
    {
        dob = "ไม่มีข้อมูล";
        age = "ไม่มีข้อมูล";
    }
    else
    {
        var year = new Date().getFullYear();
        dob = results.rows[0].dob + " ปี";
        age = year - parseInt(results.rows[0].dob.split("-")[0]);
    }
    if (results.rows[0].Address === "")
    {
        add = "ไม่มีข้อมูล";
    }
    else
    {
        add = results.rows[0].Address;
    }
    $("#personProfile").append("<thead><tr><th width='40%'><strong>ข้อมูลส่วนบุคคล</strong></th><th width='60%'></th></tr></thead><tbody><tr><td>เลขบัตรประจำตัวประชาชน</td><td>" + results.rows[0].CID + "</td>"
                        + "<tr><td>ชื่อ-นามสกุล</td><td>" + results.rows[0].FirstName + " " + results.rows[0].LastName + "</td>"
                        + "</tr><tr><td>ที่อยู่</td><td>" + add + "</td></tr><tr><td>วัน-เดือน-ปี เกิด</td><td>" + dob + "</td></tr><tr>"
                        + "<td>อายุ</td><td>" + age + " </td></tr></tbody>");
    $("#headerProfile").append("ประวัติส่วนบุคคล : " + results.rows[0].FirstName + " " + results.rows[0].LastName);
    name = results.rows[0].FirstName + " " + results.rows[0].LastName;
    //$("#personicfRecord").append
}

function showingKeyBoard(param) {
    if (param == true) {
        cordova.plugins.Keyboard.show();
        $('#otherTxt').focus().select();
    }
    else
    {
        cordova.plugins.Keyboard.close();
        $('#otherTxt').val("");
    }
}

function showQuestionaire(tx, results) {
    $("#icfform").empty();
    questionUI = results.rows[0].IUControl;
    if (questionUI == "20020" || questionUI == "20029") {
        //Checkbox
        var tempAppend = "<div class='ui-controlgroup-controls'><p>" + results.rows[0].QDESC + " :</p>"
        for (var i = 0 ; i < results.rows.length; i++) {
            if (results.rows[i].AID != "99999") {
                tempAppend += "<input type='checkbox' name='checkbox-01' id='" + results.rows[i].AID + "'><label for='" + results.rows[i].AID + "'>" + results.rows[i].ADesc + "</label>";
            }
            else {
                tempAppend += "<input type='checkbox' name='checkbox-01' id='" + results.rows[i].AID + "' onclick='showingKeyBoard(this.checked)'><label for='" + results.rows[i].AID + "'>" + results.rows[i].ADesc + "<div><input type='text' id='otherTxt' placeholer='ถ้าเลือก โปรดระบุ'/></div></label>";
            }
        }
        tempAppend += "</div>"
        $("#icfform").append(tempAppend);
    }
    else if (questionUI == "20010" || questionUI == "20030" || questionUI == "20019" || questionUI == "20039") {
        //Radio
        var tempAppend = "<div class='ui-controlgroup-controls'><p>" + results.rows[0].QDESC + " :</p>"
        for (var i = 0 ; i < results.rows.length; i++) {
            if (results.rows[i].AID != "99999") {
                tempAppend += "<input type='radio' name='radio-01' id='" + results.rows[i].AID + "' value='" + results.rows[i].AID + "'>";
                tempAppend += "<label for='" + results.rows[i].AID + "'>" + results.rows[i].ADesc + "</label>";
            }
            else {
                tempAppend += "<input type='radio' name='radio-01' id='" + results.rows[i].AID + "' value='" + results.rows[i].AID + "' onclick='showingKeyBoard(this.checked)'>";
                tempAppend += "<label for='" + results.rows[i].AID + "'>" + results.rows[i].ADesc + "<div><input type='text' id='otherTxt' placeholer='ถ้าเลือก โปรดระบุ'/></div></label>";
            }
        }
        tempAppend += "</div>";
        $("#icfform").append(tempAppend);
    }
    else if (questionUI == "10040") {
        if (results.rows.length > 0)
        {
            var tempAppend = "<div class='ui-controlgroup-controls'><p>" + results.rows[0].QDESC + " :</p><input type='number' id='" + results.rows[0].AID + "' /></div>";
        }
        $("#icfform").append(tempAppend);
    }
    else if (questionUI == "10049") {
        var tempAppend = "<div class='ui-controlgroup-controls'>";
        for (var i = 0 ; i < results.rows.length; i++) {
            tempAppend += "<p>" + results.rows[i].ADesc + " :</p><input type='number' id='" + results.rows[i].AID + "'/>";
        }
        tempAppend += "</div>";
        $("#icfform").append(tempAppend);
    }
    else {
        alert("error");
    }
    $("#icfform").trigger("create");

    //Query for value
    tx.executeSql("SELECT * FROM QRecord WHERE (CID = '" + cid + "' AND QTID = '" + sectionQTID[currentQTID] + "' AND QID = '" + sectionQID[currentQID] + "')"
        , [], (
            function (tx, results) {
                var a = results.rows.length;
                if (questionUI == "20010" || questionUI == "20030" || questionUI == "20019" || questionUI == "20039") {
                    if (a > 0) {
                        //HaveData
                        modeBindData = true;
                        //Bind คำตอบด้วย
                        $("input[name=radio-01]").each(function () {
                            if (results.rows[0].AID === $(this).val()) {
                                if (results.rows[0].AID === "99999") {
                                    $(this).attr("checked", "checked");
                                    $('#otherTxt').val(results.rows[0].Note); 
                                }
                                else {
                                    $(this).attr("checked", "checked");
                                }
                                $("input[name=radio-01]").checkboxradio("refresh");
                            }
                        });
                    }
                    else {
                        $("input[name=radio-01]:first").attr("checked", "checked");
                        $("input[name=radio-01]").checkboxradio("refresh");
                        modeBindData = false;
                    }
                    console.log(modeBindData);
                }
                else if (questionUI == "20020" || questionUI == "20029") {
                    //Checkbox
                    var arrayData = [];
                    var otherString = "";
                    var isOther = false;
                    for (var i = 0 ; i < results.rows.length; i++) {
                        arrayData.push(results.rows[i].AID);
                        if (results.rows[i].AID == "99999") {
                            otherString = results.rows[i].Note;
                            isOther = true;
                        }
                    }
                    if (a > 0) {
                        $("input[name=checkbox-01]").each(function () {
                            var index = arrayData.indexOf($(this).attr('id'));
                            if (index != -1) {
                                if ($(this).attr('id') == "99999") {
                                    if (isOther) {
                                        $(this).attr("checked", "checked");
                                        $('#otherTxt').val(otherString);
                                    }
                                }
                                else {
                                    $(this).attr("checked", "checked");
                                }
                            }
                        });
                        $("input[name=checkbox-01]").checkboxradio("refresh");
                    }
                }
                else if (questionUI == "10040") {
                    if (results.rows.length > 0) {
                        $("#" + results.rows[0].AID + "").val(results.rows[0].Note);
                    }
                }
                else if (questionUI == "10049") {
                    for (var i = 0 ; i < results.rows.length; i++) {
                        $("#" + results.rows[i].AID + "").val(results.rows[i].Note);
                    }
                }
            }
        ), errorCB);
}

function startAjaxLoader() {
    if ($('#ajaxLoadScreen') != null) {
        var loader = '<div id="ajaxLoadScreen"><img id="loadingImg" src="img/ajax-loader-bar.gif"></div>';
        $(loader).appendTo('body');
    }
}

function stopAjaxLoader() {
    $('#ajaxLoadScreen').remove();
}


$('#searchData').on('keyup', function (e) {
    var theEvent = e || window.event;
    var keyPressed = theEvent.keyCode || theEvent.which;
    //if (keyPressed == 13) {
        db.transaction(function (tx) {
            $("#dataTableSeatch").empty();
            $("mypmenu").append();
            tx.executeSql("SELECT * FROM Person WHERE (CID LIKE '%" + $('#searchData').val() + "%' OR FirstName LIKE '%" + $('#searchData').val() + "%' OR LastName LIKE '%" + $('#searchData').val() + "%') AND HostID = '" + localStorage.getItem("hostID") + "' LIMIT 10", [],
                (function (tx, results) {
                    //alert(results);
                    for (var i = 0; i < results.rows.length; i++) {
                        var pic = "";
                        if (isOnlineMode == true) {
                            if (results.rows[i].pic === "") {
                                pic = "img/avatar-placeholder.png";
                            }
                            else {
                                pic = results.rows[i].pic;
                            }
                        }
                        else {
                            pic = "img/avatar-placeholder.png";
                        }
                        $("#dataTableSeatch").append("<li id='" + results.rows[i].CID + "'><a data-transition='slide'><img src='" + pic + "'><h2>"
                                + results.rows[i].FirstName + " " + results.rows[i].LastName + "</h2><p>" + results.rows[i].CID + "</p></a></li>");
                    }
                    $("#dataTableSeatch").listview('refresh');
                }), errorCB);
        }, errorCB, (
       function () {
       }
       )
       );
    //}
});

$('#logout').click(function (e) {
    startAjaxLoader();
    db.transaction(function (tx) {
        //Drop Table
        tx.executeSql('DELETE FROM User');
    }, errorCB,
        function () {
            $.mobile.changePage("#login");
            isAccess = false;
            stopAjaxLoader();
        });
})

var cidArray = [];
var index = 0;
var arrayAnsData = [];

$('#uploadData').click(function (e) {
    if (isOnlineMode) {
        startAjaxLoader();
        cidArray = [];
        index = 0;
        arrayAnsData = [];
        db.transaction(function (tx) {
            tx.executeSql("SELECT DISTINCT CID FROM QRecord", [],
                function (tx, results) {
                    for (var i = 0; i < results.rows.length; i++) {
                        cidArray.push(results.rows[i].CID);
                    }
                }
               , errorCB
            );
        }, errorCB, function () {
            db.transaction(function (tx) {
                if (cidArray.length > 0) {
                    tx.executeSql("SELECT * FROM QRecord WHERE CID = '" + cidArray[index] + "'", [],
                            function (tx, results) {
                                if (results.rows.length > 10) {
                                    for (var j = 0; j < results.rows.length; j++) {
                                        var a = results.rows[j].QTID + ":" + results.rows[j].QID + ":" + results.rows[j].AID;
                                        if (results.rows[j].AID === "99999") {
                                            a += ":" + results.rows[j].Note;
                                        }
                                        arrayAnsData.push(a);
                                    }
                                    //console.log("http://newtestnew.azurewebsites.net/ServiceControl/service.svc/SaveRecord?Mode=0000&CID=" + cidArray[index] + "&StaffId=" + "anake@gmail.com" + "&HostId=" + "02010448" + "&RecDate=" + (new Date).toISOString() + "&SystemType=00002&src=00&Data=" + encodeURIComponent(JSON.stringify(arrayAnsData)));
                                    $.ajax({
                                        url: "http://newtestnew.azurewebsites.net/ServiceControl/service.svc/SaveRecord?Mode=0000&CID=" + cidArray[index] + "&StaffId=" + localStorage.getItem("staffID") + "&HostId=" + localStorage.getItem("hostID") + "&RecDate=" + (new Date).toISOString() + "&SystemType=00002&src=00&Data=" + encodeURIComponent(JSON.stringify(arrayAnsData)),
                                        dataType: "json",
                                        crossDomain: true
                                    })
                                    .then(function (response) {
                                        //console.log(response);
                                        db.transaction(function (tx) {
                                            //Drop Table
                                            tx.executeSql('DELETE FROM QRecord WHERE CID = "' + cidArray[index] + '"');
                                        }, errorCB,
                                            function () {
                                                index++;
                                                insertion_upload_callback(index);
                                            });
                                    });
                                }
                                else {
                                    //ไม่ต้องทำอะไร เพราะกรอกคำตอบน้อยเกินไป
                                    index++;
                                    insertion_upload_callback(index);
                                }
                            }, errorCB, function () {
                                
                            }
                        );
                }
                else
                {
                    stopAjaxLoader();
                    alert("ไม่มีข้อมูลการตอบ ICF")
                }
            }, errorCB);
        });
    }
    else {
        arrayAnsData = [];
        alert("ไม่สามารถอัพโหลดข้อมูลได้เนื่องจากอยู่ในโหมดออฟไลน์");
    }
})

function insertion_upload_callback()
{
    if (index < cidArray.length)
    {
        db.transaction(function (tx) {
            if (cidArray.length > 0) {
                tx.executeSql("SELECT * FROM QRecord WHERE CID = '" + cidArray[index] + "'", [],
                        function (tx, results) {
                            if (results.rows.length > 10) {
                                for (var j = 0; j < results.rows.length; j++) {
                                    var a = results.rows[j].QTID + ":" + results.rows[j].QID + ":" + results.rows[j].AID;
                                    if (results.rows[j].AID === "99999") {
                                        a += ":" + results.rows[j].Note;
                                    }
                                    arrayAnsData.push(a);
                                }
                                console.log("http://newtestnew.azurewebsites.net/ServiceControl/service.svc/SaveRecord?Mode=0000&CID=" + cidArray[index] + "&StaffId=" + "anake@gmail.com" + "&HostId=" + "02010448" + "&RecDate=" + (new Date).toISOString() + "&SystemType=00002&src=00&Data=" + encodeURIComponent(JSON.stringify(arrayAnsData)));
                                $.ajax({
                                    url: "http://newtestnew.azurewebsites.net/ServiceControl/service.svc/SaveRecord?Mode=0000&CID=" + cidArray[index] + "&StaffId=" + "anake@gmail.com" + "&HostId=" + "02010448" + "&RecDate=" + (new Date).toISOString() + "&SystemType=00002&src=00&Data=" + encodeURIComponent(JSON.stringify(arrayAnsData)),
                                    dataType: "json",
                                    crossDomain: true
                                })
                               .then(function (response) {
                                   console.log(response);
                                   db.transaction(function (tx) {
                                       //Drop Table
                                       tx.executeSql('DELETE FROM QRecord WHERE CID = "' + cidArray[index] + '"');
                                   }, errorCB,
                                       function () {
                                           index++;
                                           insertion_upload_callback(index);
                                       });
                               });
                            }
                            else {
                                //ไม่ต้องทำอะไร เพราะกรอกคำตอบน้อยเกินไป
                                index++;
                                insertion_upload_callback(index);
                            }
                        }, errorCB, function () {

                        }
                    );
            }
        }, errorCB);
    }
    else
    {
        stopAjaxLoader();
        alert("อัพโหลดเสร็จเรียบร้อย");
    }
}




