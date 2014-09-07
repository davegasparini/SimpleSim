var socket = io.connect('http://54.221.83.162');
var user;
var p1Price;
var p2Price;
var p3Price;

$("#timer").hide();
$("#elapsedTime").hide();
$("#adminButtons").hide();
$("#news").hide();
$("#marketPriceUpdates").hide();
$("#portfolio").hide();

function login() {
	var username = $("#usernameInputText").val();
	var password = $("#passwordInputText").val();

	socket.emit('login', { username: username,
						   password: password
						 });
};

socket.on('updatedNews', function (data) {
	$("#newsHeadline").text('Headline :  ' + data.newsHeadline);
	$("#newsArticle").text('Article :  ' + data.newsArticle);
});

socket.on('updatedPortfolio', function (data) {
	$("#pp1Code").text(data.portfolio[0].code);
	$("#pp1Amount").text(data.portfolio[0].amount);
	$("#pp1AveragePrice").text('$' + Math.ceil((data.portfolio[0].averagePrice) * 100) / 100);

	$("#pp2Code").text(data.portfolio[1].code);
	$("#pp2Amount").text(data.portfolio[1].amount);
	$("#pp2AveragePrice").text('$' + Math.ceil((data.portfolio[1].averagePrice) * 100) / 100);

	$("#pp3Code").text(data.portfolio[2].code);
	$("#pp3Amount").text(data.portfolio[2].amount);
	$("#pp3AveragePrice").text('$' + Math.ceil((data.portfolio[2].averagePrice) * 100) / 100);
});

socket.on('updatedTimer', function (data) {
    $("#timer").text('Seconds To Play :  ' + data.time);   
    $("#elapsedTime").text('Elapsed Time (in seconds) :  ' + data.elapsedTime);
});

socket.on('updatedMarketData', function (data) {
	p1Price = data.marketData[0].marketPrice;
	p2Price = data.marketData[1].marketPrice;
	p3Price = data.marketData[2].marketPrice;

	$("#product1").text('GOOG: ' + p1Price);
	$("#product2").text('MSFT: ' + p2Price);
	$("#product3").text('CAT: '  + p3Price);
});

socket.on('loginConfirmation', function (data) {
	user = data.username;
	$("#userNameDisplayText").text("login status: logged in as: " + user);
	$("#timer").show();
	$("#elapsedTime").show();
	$("#login").hide();
	$("#news").show();
	$("#marketPriceUpdates").show();
	$("#portfolio").show();
	if(user == "1") {
		$("#adminButtons").show();
	};
});

socket.on('updatedGameState', function (data) {
	$("#gameState").text('Status :  ' + data.gameState);
});

socket.on('updatedConnectedUsers', function (data) {
	$("#connectedUsers").text('online :  ' + data.connectedUsers);
});

function startTime() {
	socket.emit('startTime', {} );
};

function pauseTime() {
	socket.emit('pauseTime', {} );
};

function resetTime() {
	socket.emit('resetTime', {} );
};

function purchase(productName, amount) {

	//GOOG only
	//var newAmount = +($("#pp1Amount").text());
	//$("#pp1Amount").text(newAmount + amount);
	//var newAvgPrice = 

	socket.emit('purchase', {username: user,
							 productName: productName,
							 buyPrice: p1Price
							});

};