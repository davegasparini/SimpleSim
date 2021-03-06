var socket = io.connect('http://localhost');
var user;
var currentMarketData;
var currentPortfolio;
var defaultFunds;
var uninvestedFunds;
var realizedProfits;
var unrealizedProfits;
var gameState;

$("#timer").hide();
$("#elapsedTime").hide();
$("#adminButtons").hide();
$("#news").hide();
$("#marketPriceUpdates").hide();
$("#portfolio").hide();

socket.on('updatedNews', function (data) {
	$("#newsHeadline").text('Headline :  ' + data.newsHeadline);
	$("#newsArticle").text('Article :  ' + data.newsArticle);
});
socket.on('updatedPortfolio', function (data) {
	currentPortfolio = data.portfolio;
	uninvestedFunds = defaultFunds;
	unrealizedProfits = 0;
	for (var i = 0; i < data.portfolio.length; i++) {
		// Update Shares and Average Price.
		$("#pp"+(i+1)+"Code").text(data.portfolio[i].code);
		$("#pp"+(i+1)+"Amount").text(data.portfolio[i].amount);
		$("#pp"+(i+1)+"AveragePrice").text('$' + currentPortfolio[i].averagePrice.toFixed(2));
		// Update Uninvested Funds and Unrealized Profits
		uninvestedFunds -= data.portfolio[i].amount * 
			(Math.ceil((Math.abs(data.portfolio[i].averagePrice)) * 100) / 100);
		if (currentMarketData !== undefined) {
			var productProfit = (data.portfolio[i].amount * currentMarketData[i].marketPrice) -
							(data.portfolio[i].amount * Math.abs(data.portfolio[i].averagePrice));
			unrealizedProfits += productProfit;
		}
    };

    $("#investedFunds").text(' ------- Total Funds Invested ------- ' + 
    	'$' + (defaultFunds-uninvestedFunds).toFixed(2) + ' out of ' + '$' + defaultFunds.toFixed(2));

    $("#uninvestedFunds").text(' -- Remaining Uninvested Funds -- ' + '$' + uninvestedFunds.toFixed(2));

    if (currentMarketData !== undefined) {
		$("#unrealizedProfits").text(' ------ Total Unrealized Profits ------ ' + '$' + unrealizedProfits.toFixed(2));
	}
});

socket.on('updatedTimer', function (data) {
    $("#timer").text('Seconds To Play :  ' + data.time);   
    $("#elapsedTime").text('Elapsed Time (in seconds) :  ' + data.elapsedTime);
});
socket.on('updatedMarketData', function (data) {
	currentMarketData = data.marketData;

	// update unrealized profit data
	if ( (gameState !== 'Paused') && (currentPortfolio !== undefined) ) {
		unrealizedProfits = 0;
		for (var i = 0; i < currentPortfolio.length; i++) {
			var productProfit = (currentPortfolio[i].amount * currentMarketData[i].marketPrice) -
								(currentPortfolio[i].amount * Math.abs(currentPortfolio[i].averagePrice));
			unrealizedProfits += productProfit;
		}
		$("#unrealizedProfits").text(' ------ Total Unrealized Profits ------ ' + '$' + unrealizedProfits.toFixed(2));
	}

	// update market ticker display data
	for (var i = 0; i < currentMarketData.length; i++) {
		// test line
		if( $("#productMarketPrice"+(i+1)).text() != "") {
			var test = parseFloat($("#productMarketPrice"+(i+1)).text) < currentMarketData[i].marketPrice.toFixed(2);
			var currentNumb = parseFloat($("#productMarketPrice"+(i+1)).text());
			var newNumb = currentMarketData[i].marketPrice.toFixed(2);
			if( currentNumb < newNumb ) {
				$("#product"+(i+1)).effect("highlight", {color:"#99FF99"}, 1000);
			}
			else {
				$("#product"+(i+1)).effect("highlight", {color:"#FF9999"}, 1000);
			}
		}


		$("#productName"+(i+1)).text(currentMarketData[i].productCode);
		$("#productMarketPrice"+(i+1)).text(currentMarketData[i].marketPrice.toFixed(2));
	};
});
socket.on('loginConfirmation', function (data) {
	user = data.username;
	defaultFunds = data.defaultFunds;
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
	gameState = data.gameState;
	$("#gameState").text('GameState :  ' + gameState);
});
socket.on('updatedConnectedUsers', function (data) {
	// display updated connected users pool.
	$("#connectedUsers").text('online :  ' + data.connectedUsers);
});
socket.on('reset', function (data) {
	// clear local instance data.
	$("#unrealizedProfits").text("");
	for (var i = 0; i < currentMarketData.length; i++) {
		$("#productName"+(i+1)).text("");
		$("#productMarketPrice"+(i+1)).text("");
	};
});
function login() {
	var username = $("#usernameInputText").val();
	var password = $("#passwordInputText").val();
	socket.emit('login', { username: username,
						   password: password,
						 });
};
function startTime() {
	socket.emit('startTime', {} );
};
function pauseTime() {
	if (gameState == "Started") {
		socket.emit('pauseTime', {} );
	}
};
function resetTime() {
	if (gameState != "Hasn't Started Yet") { 
		socket.emit('resetTime', {});
	}
};
function purchase(productCode, amount) {
	if (gameState == "Started") {
    	for (var i = 0; i < currentMarketData.length; i++) {
    		if(currentMarketData[i].productCode == productCode) {
    			var newAvgPrice = [(currentPortfolio[i].amount * currentPortfolio[i].averagePrice) + 
    				(amount * currentMarketData[i].marketPrice)] / (amount + currentPortfolio[i].amount);

    			socket.emit('purchase', {username: user,
								 productCode: productCode,
								buyPrice: currentMarketData[i].marketPrice,
								 newAmountPurchased: amount,
								 newAvgPrice: newAvgPrice
								});
    		}
    	};
    }
};