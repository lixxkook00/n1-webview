var baseUrl = 'https://wallet.verafti.com/api/';
var methodAPI = {
    getBlockChain: 'GetBlockChain',
    getRecommendToken: 'RecommendToken',
    getLogo: 'GetLogo',
    getMnemonic: 'GetMnemonic',
    getAddress: 'GetAddress',
    getAddressByPrivateKey: 'GetAddressByPrivateKey',
    getBalance: 'GetBalance',
    getTransaction: 'GetTransaction',
    send: 'Send',
    searchToken: 'SearchToken',
    searchTokenBySmartContract: 'searchTokenBySmartContract',
    privacy: 'privacy'
}
var nameWallet = '';
var passwordWallet = '';
var confirmPasswordWallet = '';
var phraseWallet = '';
var privateKeyWallet = '';
var countConfirmPhraseWallet = 0;
var chainName = '';
var decimalRound = 6;
var decimalRoundUSD = 4;
var tempIDUpdate;
var data_user = localStorage.getItem('data_user');
var listChain = localStorage.getItem('list_chain');
var listAddressBook = localStorage.getItem("address_book");
var defaultToken = '';

if (data_user) {
    data_user = JSON.parse(data_user);
    //initData(data_user);
} else {
    data_user = {};
}
if (listChain) {
    listChain = JSON.parse(listChain);
} else {
    listChain = {};
}
if (listAddressBook) {
    listAddressBook = JSON.parse(listAddressBook);
} else {
    listAddressBook = {};
}
function goBack(){
    if (page.length) {
        page.splice(page.length - 1, 1);
        if (page.length)
        {
            load(page[page.length - 1], false, 'symbol=' + defaultToken);
        } else {
            var count = Object.keys(data_user).length
            if (count) {
                load('main', true);
            } else {
                load('start', true);
            }
        }
    } else {
        window.location.href = 'index.html';
        page = [];
    }
}
function updateListChain() {
    $.ajax({
        url: baseUrl + methodAPI.getBlockChain,
        success: function (data) {
            listChain = data;
            localStorage.setItem('list_chain', JSON.stringify(listChain));
        },
        error: function (err) {
            setTimeout(updateListChain, 1000);
            toast('error', err.statusText);
        }
    });
}
var checkInitCopyJS = false;
var timerCalcEstimate;
var quantityCharAddress = 15;
var socketBlockChain;
function initData() {
    clearInterval(timerCalcEstimate);
    var w = localStorage.getItem('default_wallet');
    var c = localStorage.getItem('default_chain');
    $('.chainName').text(c);
    var wallet = data_user[w];
    if (wallet) {
        $('.walletName').text(wallet.walletName);
        var chain = wallet.chain[c];
        $('.walletAddress').text(dotbetween(chain.Address, quantityCharAddress));
        $('.walletAddress').attr('text', chain.Address);
        $('.walletSymbol').text(chain.ChainSymbol);
        var token = chain.UserAddresses;
        var listToken = '';
        for (var i = 0; i < token.length; i++) {
            var item = token[i];
            if (!item.Active) continue;
            var balance = (item.Balance || 0);
            var price = (item.Price || 0);
            listToken += '<table class="item" onclick=\'load("token",true,"symbol=' + item.Symbol + '")\'><tr><td class="logo"><img src="' + item.Logo + '"/></td><td><span class="symbol">' + item.Symbol + '</span><br><span class="price price' + item.Symbol + '">$ ' + round(price, decimalRoundUSD) + '</span></td>' +
                '<td class="text-right amountAssets"><span class="balance balance' + item.Symbol + '">' + round(balance, decimalRound) + '</span><br><span class="estimate estimate' + item.Symbol + '">≈$ ' + round(price * balance, decimalRoundUSD) + '</span></td>' +
                '</tr></table>';
        }
        $('.listToken').html(listToken);
        $('.totalBalance').text(round(chain.Balance || 0, decimalRound));
        $('.totalEstimate').text(round(chain.USD || 0, decimalRoundUSD));

        setTimeout(getBalance, 1);
        calcEstimate();
        timerCalcEstimate = setInterval(calcEstimate, 5000);
        if (!checkInitCopyJS) {
            checkInitCopyJS = true;
            try {
                new ClipboardJS('.copy', {
                    text: function (trigger) {
                        var targets = $(trigger).find('[text]').attr('text');
                        toast('success', langKey['copied']);
                        return targets;
                    },
                });
            } catch (e) {

            }
        }
        if (socketBlockChain) {
            socketBlockChain.close();
        }
        if (c == 'Tron') {
            //socketBlockChain = startTronSocket(chain.Address);
        }
    }
}
function updateBalance(chain, token) {
    $.ajax({
        url: baseUrl + methodAPI.getBalance,
        data: {
            chainName: chain.Name,
            address: chain.Address,
            symbol: token.Symbol,
            contract: token.Contract,
            decimals: token.Decimals
        },
        type: 'POST',
        success: function (data) {
            if (data.check) {
                token.Balance = data.balance;
                token.Estimate = data.estimate_usd;
                token.Price = data.price;
                updateDatabase('data_user', data_user);
            }
        },
        error: function () {
            toast('error', langKey['internet_connection_error']);
        }
    });
}
function calcEstimate() {
    var w = localStorage.getItem('default_wallet');
    var c = localStorage.getItem('default_chain');
    var wallet = data_user[w];
    var chain = wallet.chain[c];
    var totalUSD = 0;
    for (var i = 0; i < chain.UserAddresses.length; i++) {
        var token = chain.UserAddresses[i];
        $('.estimate' + token.Symbol).text('≈$ ' + round((token.Estimate || 0), decimalRoundUSD));
        $('.balance' + token.Symbol).text(round((token.Balance || 0), decimalRound));
        totalUSD += token.Estimate;
    }
    $('.totalEstimate').text(round((totalUSD || 0), decimalRoundUSD));
    var basePrice = chain.UserAddresses.filter(function (x) { return x.Symbol == chain.ChainSymbol })[0].Price;
    var balance = round((totalUSD || 0) / basePrice, decimalRound);
    $('.totalBalance').text(balance || 0);
    chain.Balance = balance || 0;
    chain.USD = totalUSD;
    updateDatabase('data_user', data_user);
}
var timerGetBalance;
function getBalance() {
    // Xóa timer cũ khi pullToRefresh
    clearTimeout(timerGetBalance);
    var w = localStorage.getItem('default_wallet');
    var c = localStorage.getItem('default_chain');
    var wallet = data_user[w];
    var chain = wallet.chain[c];
    var timerDelay = 5000;
    for (var i = 0; i < chain.UserAddresses.length; i++) {
        var token = chain.UserAddresses[i];
        // Mỗi token cộng thêm 2 giây xếp hàng đợi
        setTimeout(updateBalance, timerDelay, chain, token);
        timerDelay += 5000;
    }
    // Sau khi load hết token sẽ gọi lại hàm getBalane
    // timerDelay = Tổng time của các token cộng lại
    timerGetBalance = setTimeout(getBalance, timerDelay);
}
function updateDatabase(type, data) {
    if (type == 'data_user') {
        localStorage.setItem('data_user', JSON.stringify(data));
    } else if (type == 'address_book') {
        localStorage.setItem('address_book', JSON.stringify(data));
    }
}
function round(num, decimal) {
    return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
}
var pullRefresh;
function pullToRefresh() {
    pullRefresh = PullToRefresh.init({
        mainElement: '.body',
        onRefresh: function () {
            if ($('#main').length) {
                getBalance();
            }
            if ($('.listTransaction').length) {
                load('token', false, 'symbol=' + defaultToken);
            }
        }
    });
}
var listRecommendToken;
Array.prototype.random = function () {
    return this[Math.floor((Math.random() * this.length))];
}
Number.prototype.pad = function (size) {
    var s = String(this);
    while (s.length < (size || 2)) { s = "0" + s; }
    return s;
}
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function shuffle(array) {
    //var currentIndex = array.length, randomIndex;

    //// While there remain elements to shuffle...
    //while (0 !== currentIndex) {

    //    // Pick a remaining element...
    //    randomIndex = Math.floor(Math.random() * currentIndex);
    //    currentIndex--;

    //    // And swap it with the current element.
    //    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    //}
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;

    return array;
}
function autoFormatNumber() {
    var $form = $("form");
    var $input = $form.find(".number");
    $input.on("keyup", function (event) {
        var selection = window.getSelection().toString();
        if (selection !== '') {
            return;
        }
        if ($.inArray(event.keyCode, [38, 40, 37, 39]) !== -1) {
            return;
        }
        var $this = $(this);
        var input = $this.val();
        var input = input.replace(/[\D\s\._\-]+/g, "");
        input = input ? parseInt(input, 10) : 0;
        $this.val(function () {
            return (input === 0) ? "" : input.toLocaleString("en-US");
        });
    });
}
function getParameterByName(name, url) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
function formatMoney(n, c, d, t) {
    var
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
var langKey = language();
function language() {
    var langCode = localStorage.getItem('lang') || "en";
    var jsonUrl = "js/lang/" + langCode + ".json";
    var a;
    $.ajax({
        url: jsonUrl,
        dataType: "json",
        async: false,
        success: function (jsdata) {
            a = jsdata;
            $("[langKey]").each(function (index) {
                var strTr = jsdata[$(this).attr("langKey")];
                if (strTr) {
                    if ($(this)[0].tagName == "INPUT")
                        $(this).attr("placeholder", strTr);
                    else
                        $(this).text(strTr);
                }
            });
        }
    });
    langKey = a;
    return a;
}
var page = [];

function load(namePage, push, papram) {
    var url = namePage + '.html';
    var w = localStorage.getItem('default_wallet');
    if (w) {
        var c = localStorage.getItem('default_chain');
        var wallet = data_user[w];
        if (wallet) {
            var chain = wallet.chain[c];
            defaultToken = getParameterByName('symbol', '?' + papram) || chain.ChainSymbol;
        }
    }

    $.ajax({
        url: url,
        async: false,
        success: function (data) {
            $('.body').html(data);
            $("[langKey]").each(function (index) {
                var strTr = langKey[$(this).attr("langKey")];
                if (strTr) {
                    if ($(this)[0].tagName == "INPUT")
                        $(this).attr("placeholder", strTr);
                    else
                        $(this).text(strTr);
                }
            });

            if (namePage == 'main') {
                page = ['main'];
            } else if (push) {
                page.push(namePage);
            }

            if (namePage == "send") {

            } else {
                pullToRefresh();
            }
        }
    });
}

function reload() {
    setTimeout(function () {
        window.location.reload();
    }, 1000);
}

function toast(type, ms) {
    Command: toastr[type](ms);
}

function getPrice(symbol) {
    $.ajax({
        url: 'https://api.binance.com/api/v3/ticker/price?symbol=' + symbol,
        success: function (data) {
            console.log(data);
        }
    });
}
var timerGetTransaction;
function getTransaction() {
    clearTimeout(timerGetTransaction);
    if (!$('.listTransaction').length) {
        return false;
    }
    var w = localStorage.getItem('default_wallet');
    var c = localStorage.getItem('default_chain');
    var wallet = data_user[w];
    var chain = wallet.chain[c];
    var token = chain.UserAddresses.filter(function (x) { return x.Symbol == defaultToken; })[0];
    drawTransaction(token);
    var lastTime = null;
    if (token && token.Transaction && token.Transaction.length) {
        var t = token.Transaction.filter(function (x) { return x.Status == true; })[0];
        if (t)
            lastTime = t.TimeStamp;
    }
    $.ajax({
        url: baseUrl + methodAPI.getTransaction,
        data: {
            chainName: c,
            symbol: token.Symbol,
            address: chain.Address,
            contract: token.Contract,
            decimals: token.Decimals,
            lastTime: lastTime
        },
        type: 'POST',
        success: function (data) {
            if (data.check && data.data.Transaction.length) {
                if (token.Transaction && token.Transaction.length) {
                    //debugger;
                    for (var i = 0; i < data.data.Transaction.length; i++) {
                        var t = data.data.Transaction[i];
                        var transaction = token.Transaction.filter(function (x) { return (x.Hash == t.Hash);});
                        if (transaction && transaction.length) {
                            transaction[0].Status = t.Status;
                            transaction[0].Block = t.Block;
                            transaction[0].Explorer = t.Explorer;
                            transaction[0].TimeStamp = t.TimeStamp;
                        } else {
                            token.Transaction.unshift(t);
                            //Fix Optimal
                            token.Transaction = token.Transaction.slice(0, 100);
                        }
                    }
                } else {
                    token.Transaction = data.data.Transaction;
                }
                updateDatabase('data_user', data_user);
                drawTransaction(token);
            }
            timerGetTransaction = setTimeout(getTransaction, 5000);
        }
    });
}
var txTransaction;
function drawTransaction(token) {
    if (token && token.Transaction && token.Transaction.length) {
        token.Transaction.sort(function (a, b) {
            return b.TimeStamp - a.TimeStamp;
        });
        var html = '';
        for (var i = 0; i < token.Transaction.length; i++) {
            var item = token.Transaction[i];
            var address = item.From;
            var color = "green";
            var type = 'receive';
            if (item.Category == "send") {
                address = item.To;
                color = "red";
                type = 'send';
            }
            var pending = '';
            if (!item.Status) {
                pending = '<br /><span class="pending"><i class="fa fa-spinner fa-spin"></i> Pending</span>';
            }
            var tab = $('.token .active [data-toggle="tab"]').attr('id');
            if (tab == type || tab == "all")
                html += '<table class="item" tx="' + item.Hash + '"><tr class="' + type + '"><td class="ellipsis address ">' + dotbetween(address, quantityCharAddress) + '<br>' + new Date(item.TimeStamp).toLocaleString() + '</td><td style="color: ' + color + '" class="text-right"><div class="amount">' + (item.Category == "receive" ? "+" + item.Amount : "-" + +item.Amount) + pending + '</div></td></tr></table>'
        }
        $('.listTransaction').html(html);
    }
}
function getAllTransaction() {
    if (!$('.listAllTransaction').length) {
        return false;
    }
    var w = localStorage.getItem('default_wallet');
    var wallet = data_user[w];
    var chains = wallet.chain;
    var history = [];
    $.each(chains, function (index) {
        var tokens = chains[index].UserAddresses;
        if (tokens) {
            $.each(tokens, function (i) {
                var transactions = tokens[i].Transaction;
                if (transactions)
                    history = history.concat(transactions);
            });
        }
    });
    history.sort(function (a, b) {
        return b.TimeStamp - a.TimeStamp;
    });
    if (history.length) {
        var html = '';
        for (var i = 0; i < history.length; i++) {
            var item = history[i];
            var color = "green";
            var type = 'receive';
            if (item.Category == "send") {
                color = "red";
                type = 'send';
            }
            var tab = $('.token .active [data-toggle="tab"]').attr('id');
            if (tab == type || tab == "all")
                html += '<table class="item viewTransactionAllBrowser" url="' + item.Explorer + '"><tr class="' + type + '"><td class="ellipsis address "><span langKey="from">From </span>: ' + dotbetween(item.From, 10) + '<br><span langKey="to">To </span>: ' + dotbetween(item.To, 10) + '<br>' + new Date(item.TimeStamp).toLocaleString() + '</td><td style="color: ' + color + '" class="text-right"><div class="amount">' + (item.Category == "receive" ? "+" + item.Amount : "-" + +item.Amount) + '<br><span style="color: #999; font-size: 12px;">' + item.Symbol + ' Transfer</span><br><span class="status">Confirmed</span></div></td></tr></table>'
        }
        $('.listAllTransaction').html(html);
    }
}
function initManagePage() {
    var default_wallet = localStorage.getItem('default_wallet');
    var default_chain = localStorage.getItem('default_chain');
    $('.chainName').text(default_chain);

    var listWallet = '';
    for (var k in data_user) {
        var item = data_user[k];
        var chain = item.chain[default_chain];
        if (!chain) {
            $('.overlayQR').show();
            $.ajax({
                url: baseUrl + methodAPI.getAddress,
                data: {
                    chainName: default_chain,
                    mnemonic: data_user[k].mnemonic,
                    deviceAddress: 1
                },
                type: 'POST',
                async: false,
                success: function (data) {
                    if (data.check) {
                        item.chain[default_chain] = data.data;
                        chain = data.data;
                        updateDatabase('data_user', data_user);
                    } else {
                        toast('error', data.ms);
                    }
                    $('.overlayQR').hide();
                }
            });
        }
        listWallet += '<div class="swiper-slide itemWallet" name=' + k + '>' +
                        '<h4 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' +
                            '<i class="fa fa-check-circle" aria-hidden="true"></i> <span class="itemWalletname">' + k + '</span>' +
                        '</h4>' +
                        '<div><span class="totalBalance">' + round(chain.Balance || 0, decimalRound) + '</span> <span class="walletSymbol">' + chain.ChainSymbol + '</span></div>' +
                        '<div class="walletAddress">' + dotbetween(chain.Address, quantityCharAddress) + '</div>' +
                    '</div>';
    }
    $('.walletName').text(default_wallet);
    $('.listWallet .swiper-wrapper').html(listWallet);
    var initialSlide = 0;
    for (var k in data_user) {
        var item = data_user[k];
        if (default_wallet == k) {
            break;
        }
        initialSlide++;
    }
    var Swipes = new Swiper('.swiper-container', {
        loop: false,
        initialSlide: initialSlide,
        pagination: {
            el: '.swiper-pagination',
        },
        on: {
            slideChange: function () {
                if (Swipes) {
                    var wallet = data_user[Object.keys(data_user)[Swipes.activeIndex]];
                    localStorage.setItem('default_wallet', wallet.walletName);
                    initManagePage();
                }
            },
            doubleTap: function () {
                load('main', true);
            }
        }
    });

    //var walletName = localStorage.getItem('default_wallet');
    //var wallet = data_user[walletName];
}
function validChangePass() {
    if ($('.inputPasswrord').val() && $('.inputNewPassword').val() && $('.inputConfirmPassword').val()
        && $('.inputNewPassword').val().length >= 8 && $('.inputNewPassword').val() == $('.inputConfirmPassword').val()) {
        $('.btnChangeWalletPassword').prop('disabled', false);
    } else {
        $('.btnChangeWalletPassword').prop('disabled', true);
    }
}
function md5(text) {
    return CryptoJS.MD5(text).toString()
}
function androidBtn(type) {
    Android.scanQR(type);
}
var macAddress;
function updateMacAddressDevice(macAddress) {
    macAddress = macAddress;
}
function scanQR(data) {
    var d = JSON.parse(data);
    if (d.type == "scanAddress") {
        if ($('.receivingAccount').length) {
            $('.receivingAccount').val(d.result);
        } else {
            load('send', true);
            $('.receivingAccount').val(d.result);
        }
    }
}
function initRecommendToken() {
    var default_wallet = localStorage.getItem('default_wallet');
    var default_chain = localStorage.getItem('default_chain');
    var wallet = data_user[default_wallet];
    var chain = wallet.chain[default_chain];
    $.ajax({
        url: baseUrl + methodAPI.getRecommendToken,
        type: 'POST',
        data: {
            chainName: default_chain
        },
        success: function (data) {
            if (!data.check) {
                toast('error', data.ms);
            } else {
                listRecommendToken = data.data;
                var listToken = '';
                for (var i = 0; i < data.data.length; i++) {
                    var item = data.data[i];
                    var token = chain.UserAddresses.filter(function (x) { return x.Symbol == item.Symbol;})[0];
                    if (item.Symbol == chain.ChainSymbol) continue;
                    var btn = (token ? '<i class="fa btnAddRecommendToken fa-minus-circle" symbol="' + item.Symbol + '" style="color: green;"></i>' : '<i class="fa fa-plus-circle btnAddRecommendToken" symbol="' + item.Symbol + '"></i>')
                    listToken += '<table class="item"><tr><td class="logo"><img src="' + item.Logo + '"/></td><td><span class="symbol"><b>' + item.Symbol + '</b></span><br><span class="price">' + item.Name + '</span></td>' +
                        '<td class="text-right">' + btn + '</td>' +
                        '</tr><table>';
                }
                $('.listToken').html(listToken);
            }
        }
    });
}
function dotbetween(text, numberChar) {
    var t = text;
    if (text.length >= (numberChar * 2)) {
        t = text.substr(0, numberChar) + "..." + text.substr(text.length - numberChar, text.length - 1);
    }
    return t;
}
function drawAddressBook(data) {
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        html += '<div class="item">'+
            '<div class="name">'+
                '<i class="fa fa-user" style="margin-right: 10px;font-size: 18px;"></i> <div class="nowrap">' + item.name + '</div>' +
            '</div>'+
            '<div class="address">' + item.address + '<i class="fa fa-clone btnCopy" text="' + item.address + '"></i>' +
            '</div>'+
            '<div class="note">' + item.description + '</div>' +
            '<div class="control"><button class="btn btn-default">' + item.chain + '</button> <span class="pull-right"> <button class="btn btn-info updateAddressBook" id=' + item.id + '><i class="fa fa-pencil"></i></button> &nbsp; <button class="btn btn-danger deleteAddressBook" id=' + item.id + '><i class="fa fa-trash"></i></button></span></div>' +
        '</div>';
    }
    $('.listAddressBook').append(html);
}
function getAddressBook(chainName) {
    $('.listAddressBook').html('');
    if (chainName) {
        var a = listAddressBook[chainName];
        if(a)
        {
            drawAddressBook(a);
        }
    } else {
        $.each(listAddressBook, function (key) {
            var a = listAddressBook[key];
            if (a)
                drawAddressBook(a);
        });
    }
}
function drawChainList(chainList, showBalance) {
    var default_wallet = localStorage.getItem('default_wallet');
    var default_chain = localStorage.getItem('default_chain');
    var wallet = data_user[default_wallet];
    var html = '';
    var tt = 0;
    for (var i = 0; i < chainList.length; i++) {
        var item = chainList[i];
        if (!item.Active) continue;
        if (showBalance) {
            var chain = wallet.chain[item.Name];
            html += '<table class="item" name="' + item.Name + '"><tr><td class="logo"><img src="' + item.Logo + '"/></td><td style="padding-left: 3px;"><b class="symbol">' + item.Name + '</b><br><span style="color: #8e8d8d; font-size: 12px;">$ ' + round(item.Price || 0, decimalRoundUSD) + '</span></td>' +
                '<td class="text-right amountAssets"><b>' + round(chain ? chain.Balance || 0 : 0, decimalRound) + ' ' + item.Symbol + '</b><br><span style="color: #8e8d8d; font-size: 12px;">≈$ ' + round(chain ? chain.USD || 0 : 0, decimalRoundUSD) + '</span></td>' +
                '</tr></table>';
            tt += chain ? chain.USD || 0 : 0;
        } else {
            html += '<div class="item" name="' + item.Name + '"><img src="' + item.Logo + '" /> <b class="name">' + item.Name + '</b></div>';
        }
    }
    $('.chainlist').html(html);
    $('.totalBalanceWallet').text(formatMoney(tt,2));
}
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);
var xDown = null;
var yDown = null;

function getTouches(evt) {
    return evt.touches ||             // browser API
           evt.originalEvent.touches; // jQuery
}

function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};
function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
        if (xDiff > 0) {
            //console.log('left swipe')
        } else if (xDiff < 0) {
            goBack();
        }
    } else {
        if (yDiff > 0) {
            /* up swipe */
        } else {
            /* down swipe */
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};

//// Socket
//function startTronSocket(address) {
//    let socket = new WebSocket("wss://apilist.tronscan.org/api/tronsocket/homepage");
//    socket.onopen = function (e) {
//        console.log('Connect tron success');
//    };
//    socket.onmessage = function (event) {
//        //console.log(JSON.parse(event.data));
//        var data = JSON.parse(event.data).latest_transaction_info.data;//.filter(p=> (p.ownerAddress == address || p.toAddress == address));
//        if (data.length) {
//            console.log(data);
//        }
//    };
//    socket.onclose = function (event) {
//        if (event.wasClean) {
//            //console.log('error', `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
//        } else {
//            //console.log('error', '[close] Connection died');
//        }
//    };
//    socket.onerror = function (error) {
//        console.log('error', error.message);
//    };
//    return socket;
//}
$().ready(function () {
    updateListChain();
    // Language
    $(document).on('click', '#btnBack', function () {
        goBack();
    });
    $(document).on('click', '.btn-next-step1', function () {
        nameWallet = $('.inputNameWallet').val();
        if (nameWallet.length >= 1) {
            if (data_user[nameWallet]) {
                toast('error', langKey['wallet_name_already_exists']);
            } else {
                load('create-pass', true);
            }
        } else {
            $('.inputNameWallet').focus();
        }
    });
    $(document).on('keyup paste', '.inputNameWallet', function () {
        if ($(this).val()) {
            $('.btn-next-step1').prop('disabled', false);
            $('.btnChangeWalletName').prop('disabled', false);
        } else {
            $('.btn-next-step1').prop('disabled', true);
            $('.btnChangeWalletName').prop('disabled', true);
        }
    });
    var checkPass = false;
    $(document).on('keyup paste', '.inputPasswordWallet', function () {
        var pass = $(this).val();
        var checkUpper = false;
        var checkLower = false;
        var checkNumber = false;
        var checkLength = false;
        if (/[A-Z]/.test(pass)) {
            checkUpper = true;
            $('.uppercase_letter').addClass('active');
        } else {
            checkUpper = false;
            $('.uppercase_letter').removeClass('active');
        }
        if (/[a-z]/.test(pass)) {
            checkLower = true;
            $('.lowercase_letter').addClass('active');
        } else {
            checkLower = false;
            $('.lowercase_letter').removeClass('active');
        }
        if (/[0-9]/.test(pass)) {
            checkNumber = true;
            $('.one_number').addClass('active');
        } else {
            checkNumber = false;
            $('.one_number').removeClass('active');
        }
        if (pass.length >= 8) {
            checkLength = true;
            $('.at_least_8_characters').addClass('active');
        } else {
            checkLength = false;
            $('.at_least_8_characters').removeClass('active');
        }
        if (checkUpper && checkLower && checkNumber && checkLength) {
            checkPass = true;
            $('.btn-next-step2').prop('disabled', false);
        } else {
            checkPass = false;
            $('.btn-next-step2').prop('disabled', true);
        }
    });
    $(document).on('click', '.btn-next-step2', function () {
        if (checkPass) {
            passwordWallet = $('.inputPasswordWallet').val();
            load('create-confirm-pass', true);
        } else {
            $('.inputPasswordWallet').focus();
        }
    });
    var checkConfirmPass = false;
    $(document).on('change keyup', '.inputConfirmPasswordWallet', function () {
        if ($(this).val() != passwordWallet) {
            $('.errorConfirmPassword').show();
            $('.btn-next-step3').prop('disabled', true);
            checkConfirmPass = false;
        } else {
            $('.errorConfirmPassword').hide();
            $('.btn-next-step3').prop('disabled', false);
            checkConfirmPass = true;
        }
        confirmPasswordWallet = $(this).val();
    });
    $(document).on('click', '.btn-next-step3', function () {
        if (checkConfirmPass) {
            if (phraseWallet || privateKeyWallet) {
                load('chainlist', true);
            } else {
                load('create-phrase', true);
            }
        } else {
            $('.inputConfirmPasswordWallet').focus();
        }
    });
    $(document).on('click', '.btn-next-step4', function () {
        var This = $(this);
        This.prop('disabled', true);
        countConfirmPhraseWallet = 0;
        $.ajax({
            url: baseUrl + methodAPI.getMnemonic,
            async: false,
            type: 'POST',
            success: function (data) {
                load('backup-phrase', false);
                phraseWallet = data;
                var list = data.split(' ');
                var html = '';
                var margin = 5;
                var width = (($('.listPhraseWallet').innerWidth() - 10) / 3) - (margin * 2);
                for (var i = 0; i < list.length; i++) {
                    html += '<div class="item" style="width: ' + width + 'px; height: ' + width + 'px;margin: ' + margin + 'px;">' +
                        '<span class="bgItem">' + (i + 1) + '</span>' +
                        '<div class="text">' + list[i] + '</div>' +
                        '</div>';
                }
                $('.listPhraseWallet').html(html);
                $('.listPhraseWallet .bgItem').css('top', 'calc(50% - ' + (70 / 2) + 'px)');
                $('.listPhraseWallet .text').css('top', "-" + ((width / 2) - (28 / 2)) + "px");
            },
            error: function (e) {
                toast('error', e.statusText);
                This.prop('disabled', false);
            }
        });
    });
    $(document).on('click', '.showMnemonicQR', function () {
        $('#mnemonicqr').html('');
        new QRCode("mnemonicqr", {
            text: phraseWallet,
            width: 200,
            height: 200
        });
        $('.overlayQR').show();
    });
    $(document).on('click', '.closepopup', function () {
        $('.overlayQR').hide();
    });
    $(document).on('click', '.listRandomPhraseWallet .item', function () {
        var text = $(this).text();
        var key = list[random];
        if (text != key) {
            toast('error', langKey['wrong_order_please_try_again']);
        } else {
            toast('success', langKey['success']);
            countConfirmPhraseWallet++;
            if (countConfirmPhraseWallet < 3)
                load('confirm-phrase', false);
            else {
                load('chainlist', true);
            }
        }
    });
    $(document).on('click', '.chainlist .item', function () {
        chainName = $(this).attr('name');
        if (!nameWallet) {
            nameWallet = localStorage.getItem('default_wallet');
        } else {
            data_user[nameWallet] = {
                walletName: nameWallet,
                password: CryptoJS.MD5(passwordWallet).toString(),
                mnemonic: phraseWallet,
                chain: {}
            };
        }
        if (!data_user[nameWallet].chain[chainName]) {
            $('.overlayQR').show();
            var api = '';
            var dataPost = {};
            if (phraseWallet) {
                api = baseUrl + methodAPI.getAddress;
                dataPost = {
                    mnemonic: phraseWallet
                }
            } else if (privateKeyWallet) {
                api = baseUrl + methodAPI.getAddressByPrivateKey;
                dataPost = {
                    privateKey: privateKeyWallet
                }
            } else {
                api = baseUrl + methodAPI.getAddress;
                dataPost = {
                    mnemonic: data_user[nameWallet].mnemonic
                }
            }

            dataPost.chainName = chainName;
            dataPost.deviceAddress = 1;

            $.ajax({
                url: api,
                data: dataPost,
                type: 'POST',
                success: function (data) {
                    $('.overlayQR').hide();
                    if (data.check) {
                        data_user[nameWallet].chain[chainName] = data.data;
                        data_user[nameWallet].mnemonic = data.data.Mnemonic;
                        updateDatabase('data_user', data_user);
                        localStorage.setItem('default_wallet', nameWallet);
                        localStorage.setItem('default_chain', chainName);
                        window.location.href = 'index.html';
                    } else {
                        toast('error', data.ms);
                        if (!Object.keys(data_user[nameWallet].chain).length)
                        {
                            delete data_user[nameWallet];
                        }
                        return false;
                    }
                },
                error: function (err) {
                    toast('error', err.statusText);
                    return false;
                }
            });
        } else {
            localStorage.setItem('default_wallet', nameWallet);
            localStorage.setItem('default_chain', chainName);
            window.location.href = 'index.html';
        }
    })
    // Add Token
    $(document).on('click', '.btnAddRecommendToken', function () {
        var default_wallet = localStorage.getItem('default_wallet');
        var default_chain = localStorage.getItem('default_chain');
        var wallet = data_user[default_wallet];
        var chain = wallet.chain[default_chain];
        var symbol = $(this).attr('symbol');
        var checkUpdate = false;
        if ($(this).hasClass('fa-plus-circle')) {
            $(this).removeClass('fa-plus-circle');
            $(this).addClass('fa-minus-circle').css('color', 'green');
            var token = listRecommendToken.filter(function (x) { return x.Symbol == symbol;})[0];
            chain.UserAddresses.push({
                Active: true,
                Address: chain.Address,
                Balance: 0,
                Contract: token.Contract,
                Decimals: token.Decimals,
                Estimate: 0,
                ID: uuid(),
                IDUserWallet: chain.ID,
                Logo: token.Logo,
                Name: token.Name,
                Price: 0,
                Symbol: token.Symbol
            });
            checkUpdate = true;
        } else {
            $(this).removeClass('fa-minus-circle');
            $(this).addClass('fa-plus-circle').css('color', 'black');
            $.each(chain.UserAddresses, function (i) {
                if (chain.UserAddresses[i].Symbol === symbol) {
                    chain.UserAddresses.splice(i, 1);
                    return false;
                }
            });
        }
        updateDatabase('data_user', data_user);
        if(checkUpdate){
            var tk = chain.UserAddresses.filter(function(x){ return x.Symbol == symbol;})[0];
            updateBalance(chain, tk);
        }
    });
    $(document).on('click', '.btnRemoveRecommendToken', function () {
        var default_wallet = localStorage.getItem('default_wallet');
        var default_chain = localStorage.getItem('default_chain');
        var wallet = data_user[default_wallet];
        var chain = wallet.chain[default_chain];
        var symbol = $(this).attr('symbol');
        $.each(chain.UserAddresses, function (i) {
            if (chain.UserAddresses[i].Symbol === symbol) {
                chain.UserAddresses.splice(i, 1);
                return false;
            }
        });
        updateDatabase('data_user', data_user);
        $(this).parent().parent().parent().parent().remove();
    });
    $(document).on('submit', '.formAddToken', function (e) {
        e.preventDefault();
        var contract = $(this).find('.contract').val();
        if (!contract) {
            $(this).find('.contract').focus();
            return false;
        }
        var name = $(this).find('.name').val();
        if (!name) {
            $(this).find('.name').focus();
            return false;
        }
        var symbol = $(this).find('.symbol').val();
        if (!symbol) {
            $(this).find('.symbol').focus();
            return false;
        }
        symbol = symbol.toUpperCase();
        var decimal = $(this).find('.decimal').val();
        if (!decimal) {
            $(this).find('.decimal').focus();
            return false;
        }
        var w = localStorage.getItem('default_wallet');
        var c = localStorage.getItem('default_chain');
        var wallet = data_user[w];
        var chain = wallet.chain[c];
        var address = chain.Address;
        for (var i = 0; i < chain.UserAddresses.length; i++) {
            if (chain.UserAddresses[i].Symbol == symbol) {
                toast('error', langKey['token_already_exists']);
                return false;
            }
        }
        var logo = $(this).find('.logo').val();
        if (!logo) {
            $.ajax({
                url: baseUrl + methodAPI.getLogo,
                data: {
                    symbol: symbol
                },
                type: 'POST',
                async: false,
                success: function (data) {
                    if (data.check) {
                        logo = data.Logo;
                    } else {
                        toast('error', data.ms);
                        return false;
                    }
                },
                error: function (err) {
                    toast('error', err.statusText);
                    return false;
                }
            });
        }
        chain.UserAddresses.push({
            Active: true,
            Address: address,
            Contract: contract,
            Decimals: decimal,
            ID: uuid(),
            IDUserWallet: chain.ID,
            Logo: logo,
            Name: name,
            Symbol: symbol
        });
        updateDatabase('data_user', data_user);
        load('main', false);
        toast('success', langKey['success']);
    });
    var delaySearchToken;
    $(document).on('keyup paste', '.assetsManage .searchToken', function () {
        clearTimeout(delaySearchToken);
        var key = $(this).val();
        if (key) {
            delaySearchToken = setTimeout(function () {
                $('.overlayQR').show();
                $.ajax({
                    url: baseUrl + methodAPI.searchToken,
                    type: 'POST',
                    data: {
                        chainName: default_chain,
                        key: key
                    },
                    success: function (data) {
                        $('.overlayQR').hide();
                        if (!data.check) {
                            toast('error', data.ms);
                        } else {
                            listRecommendToken = data.data;
                            var listToken = '';
                            for (var i = 0; i < data.data.length; i++) {
                                var item = data.data[i];
                                var token = chain.UserAddresses.filter(function (x) { return x.Symbol == item.Symbol; })[0];
                                if (item.Symbol == chain.ChainSymbol) continue;
                                var btn = (token ? '<i class="fa btnAddRecommendToken fa-minus-circle" symbol="' + item.Symbol + '" style="color: green;"></i>' : '<i class="fa fa-plus-circle btnAddRecommendToken" symbol="' + item.Symbol + '"></i>')
                                listToken += '<table class="item"><tr><td class="logo"><img src="' + item.Logo + '"/></td><td><span class="symbol"><b>' + item.Name + '</b> (' + item.Symbol + ')</span><br><span class="price">' + dotbetween(item.Contract, quantityCharAddress) + '</span></td>' +
                                    '<td class="text-right">' + btn + '</td>' +
                                    '</tr><table>';
                            }
                            $('.listToken').html(listToken);
                        }
                    },
                    error: function (err) {
                        $('.overlayQR').hide();
                        toast('error', err.statusText);
                    }
                });
            }, 1000);
        } else {
            initRecommendToken();
        }
    });
    $(document).on('paste change', '.formAddToken .contract', function () {
        var smartContract = $(this).val();
        if (smartContract) {
            $('.overlayQR').show();
            $.ajax({
                url: baseUrl + methodAPI.searchTokenBySmartContract,
                type: 'POST',
                data: {
                    chainName: default_chain,
                    smartContract: smartContract
                },
                success: function (data) {
                    $('.overlayQR').hide();
                    if (data.check) {
                        var token = data.data;
                        $('.formAddToken .name').val(token.Name || '');
                        $('.formAddToken .symbol').val(token.Symbol || '');
                        $('.formAddToken .decimal').val(token.Decimals || '');
                        $('.formAddToken .logo').val(token.Logo || '');
                    } else {
                        toast('error', data.ms);
                    }
                },
                error: function (err) {
                    toast('error', err.statusText);
                    $('.overlayQR').hide();
                }
            });
        }
    });
    // Tab panel
    //$('a[data-toggle="tab"]').on('hide.bs.tab', function (e) {
    //    var $old_tab = $($(e.target).attr("href"));
    //    var $new_tab = $($(e.relatedTarget).attr("href"));
    //    if ($new_tab.index() < $old_tab.index()) {
    //        $old_tab.css('position', 'relative').css("right", "0").show();
    //        $old_tab.animate({ "right": "-100%" }, 300, function () {
    //            $old_tab.css("right", 0).removeAttr("style");
    //        });
    //    }
    //    else {
    //        $old_tab.css('position', 'relative').css("left", "0").show();
    //        $old_tab.animate({ "left": "-100%" }, 300, function () {
    //            $old_tab.css("left", 0).removeAttr("style");
    //        });
    //    }
    //});
    //$('a[data-toggle="tab"]').on('show.bs.tab', function (e) {
    //    var $new_tab = $($(e.target).attr("href"));
    //    var $old_tab = $($(e.relatedTarget).attr("href"));
    //    if ($new_tab.index() > $old_tab.index()) {
    //        $new_tab.css('position', 'relative').css("right", "-2500px");
    //        $new_tab.animate({ "right": "0" }, 500);
    //    }
    //    else {
    //        $new_tab.css('position', 'relative').css("left", "-2500px");
    //        $new_tab.animate({ "left": "0" }, 500);
    //    }
    //});
    // Transaction
    $(document).on('click', '.token [data-toggle="tab"]', function () {
        if ($('.listAllTransaction').length) {
            getAllTransaction();
        } else {
            drawTransaction(token);
        }
    });
    // Manage
    $(document).on('click', '.btnChangeWalletName', function () {
        var default_wallet = localStorage.getItem('default_wallet');
        var newWalletName = $('.inputNameWallet').val();
        if (newWalletName && default_wallet !== newWalletName && !data_user[newWalletName]) {
            Object.defineProperty(data_user, newWalletName, Object.getOwnPropertyDescriptor(data_user, default_wallet));
            delete data_user[default_wallet];
            localStorage.setItem('default_wallet', newWalletName);
            data_user[newWalletName].walletName = newWalletName;
            updateDatabase('data_user', data_user);
            window.location.href = 'index.html';
        }
    });
    $(document).on('click', '.changePassword .btnChangeWalletPassword', function () {
        var default_wallet = localStorage.getItem('default_wallet');
        var wallet = data_user[default_wallet];
        var passold = $('.inputPasswrord').val();
        if (md5(passold) != wallet.password) {
            $('.errorConfirmPassword').show();
            return false;
        } else {
            $('.errorConfirmPassword').hide();
        }
        var newPass = $('.inputNewPassword').val();
        var default_wallet = localStorage.getItem('default_wallet');
        wallet.password = md5(newPass);
        updateDatabase('data_user', data_user);
        toast('success', langKey['success']);
        load('main', true);
        page = [];
    });
    $(document).on('change paste keyup', '.inputNewPassword', function () {
        var pass = $(this).val();
        var checkUpper = false;
        var checkLower = false;
        var checkNumber = false;
        var checkLength = false;
        if (/[A-Z]/.test(pass)) {
            checkUpper = true;
            $('.uppercase_letter').addClass('active');
        } else {
            checkUpper = false;
            $('.uppercase_letter').removeClass('active');
        }
        if (/[a-z]/.test(pass)) {
            checkLower = true;
            $('.lowercase_letter').addClass('active');
        } else {
            checkLower = false;
            $('.lowercase_letter').removeClass('active');
        }
        if (/[0-9]/.test(pass)) {
            checkNumber = true;
            $('.one_number').addClass('active');
        } else {
            checkNumber = false;
            $('.one_number').removeClass('active');
        }
        if (pass.length >= 8) {
            checkLength = true;
            $('.at_least_8_characters').addClass('active');
        } else {
            checkLength = false;
            $('.at_least_8_characters').removeClass('active');
        }
    });
    $(document).on('click', '.btnBackupPrivateKey', function () {
        $('.overlayEnterPassword').show();
        $('.overlayEnterPassword').attr('type', 'backupPrivatekey');
        $('.inputWalletPassword').focus();
    });
    $(document).on('click', '.btnBackupMnemonic', function () {
        $('.overlayEnterPassword').show();
        $('.overlayEnterPassword').attr('type', 'backupMnemonic');
        $('.inputWalletPassword').focus();
    });
    $(document).on('click', '.btnQRcodePrivatekey', function () {
        var default_wallet = localStorage.getItem('default_wallet');
        var wallet = data_user[default_wallet];
        var default_chain = localStorage.getItem('default_chain');
        var key = wallet.chain[default_chain].PrivateKey;
        $('#mnemonicqr').html('');
        new QRCode("mnemonicqr", {
            text: key,
            width: 200,
            height: 200
        });
        $('.overlayQR').show();
    });
    $(document).on('click', '.btnQRcodeMnemonic', function () {
        var default_wallet = localStorage.getItem('default_wallet');
        var wallet = data_user[default_wallet];
        var default_chain = localStorage.getItem('default_chain');
        var key = wallet.chain[default_chain].Mnemonic;
        $('#mnemonicqr').html('');
        new QRCode("mnemonicqr", {
            text: key,
            width: 200,
            height: 200
        });
        $('.overlayQR').show();
    });
    $(document).on('click', '.btnDeleteWallet', function () {
        $('.overlayEnterPassword').show();
        $('.overlayEnterPassword').attr('type', 'deleteWallet');
        $('.inputWalletPassword').focus();
    });
    $(document).on('click', '.overlayEnterPassword .cancel', function () {
        $('.overlayEnterPassword').hide();
        $('.overlayEnterPassword input').val('');
    });
    $(document).on('click', '.overlayEnterPassword .done', function () {
        $('.overlayEnterPassword').hide();
        var default_wallet = localStorage.getItem('default_wallet');
        var wallet = data_user[default_wallet];
        var pass = $('.overlayEnterPassword input').val();
        $('.overlayEnterPassword input').val('');
        if (!pass || wallet.password != CryptoJS.MD5(pass).toString()) {
            toast('error', langKey['password_does_not_match']);
            return false;
        }

        var type = $('.overlayEnterPassword').attr('type');
        if (type == "backupPrivatekey") {
            load('backup-private-key', true);
        } else if (type == "backupMnemonic") {
            load('backup-mnemonic', true);
        } else if (type == "deleteWallet") {
            delete data_user[default_wallet];
            updateDatabase('data_user', data_user);
            toast('success', langKey['success']);
            if (data_user && Object.keys(data_user).length > 0) {
                var w = data_user[Object.keys(data_user)[0]];
                localStorage.setItem('default_wallet', w.walletName);
                load('main', true);
            } else {
                setTimeout(function () {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } else if (type = 'sendToken') {
            $('.overlayQR').show();
            $('.errorSend').hide();
            $.ajax({
                url: baseUrl + methodAPI.send,
                type: 'POST',
                crossDomain: true,
                beforeSend: function (request) {
                    request.setRequestHeader("auth", sendToken.auth);
                },
                data: sendToken,
                success: function (data) {
                    $('.overlayQR').hide();
                    if (!data.check) {
                        $('.errorSend span').text(data.ms);
                        $('.errorSend').show();
                    } else {
                        var transaction = {
                            Amount: sendToken.amount,
                            From: sendToken.fromAddress,
                            Hash: data.ms,
                            Status: false,
                            TimeStamp: new Date().getTime(),
                            To: sendToken.toAddress,
                            Symbol: sendToken.symbol,
                            Category: 'send'
                        }

                        var default_wallet = localStorage.getItem('default_wallet');
                        var default_chain = localStorage.getItem('default_chain');
                        var wallet = data_user[default_wallet];
                        var chain = wallet.chain[default_chain];
                        var token = chain.UserAddresses.filter(function (x) { return (x.Symbol == defaultToken) })[0];
                        token.Transaction.unshift(transaction);
                        updateDatabase('data_user', data_user);

                        $('#btnBack').click();
                        if (!$('.listTransaction').length) {
                            load('token', true, 'symbol=' + sendToken.symbol);
                        }
                    }
                }
            });
        }
    });
    // Send
    $(document).on('click', '.selectToken', function () {
        $('.overlaySelectToken').show();
        pullRefresh.destroy();
    });
    $(document).on('keyup paste', '.overlaySelectToken .searchToken', function () {
        var key = $(this).val();
        if (!key) {
            $('.listTokenSelect .item').show();
        } else {
            $('.listTokenSelect .item').hide();
            $('.listTokenSelect .item').each(function () {
                var symbol = $(this).attr('symbol');
                if (symbol.toLocaleLowerCase().indexOf(key.toLocaleLowerCase()) > -1) {
                    $(this).show();
                }
            });
        }
    });
    $(document).on('click', '.listTokenSelect .item', function () {
        var symbol = $(this).attr('symbol');
        defaultToken = symbol;
        var default_wallet = localStorage.getItem('default_wallet');
        var default_chain = localStorage.getItem('default_chain');
        var wallet = data_user[default_wallet];
        var chain = wallet.chain[default_chain];
        var token = chain.UserAddresses.filter(function (x) { return (x.Symbol == defaultToken) })[0];
        $('.send .balance').text(token.Balance || 0);
        $('.selectToken').html('<img src="' + token.Logo + '" class="icon"/> <span style="font-weight: bold; position: relative; top: 2px;">' + token.Symbol + '</span><i style="position: relative; top: 7px;" class="fa fa-angle-right pull-right"></i>');
        $('.overlaySelectToken').hide();
    });
    $(document).on('click', '.btnMaxSend', function () {
        $('.send .amount').val(token.Balance || 0);
    });
    $(document).on('keyup paste', '.overlaySelectAddressBook .searchToken', function () {
        var key = $(this).val();
        if (!key) {
            $('.listAddressBookSelect .item').show();
        } else {
            $('.listAddressBookSelect .item').hide();
            $('.listAddressBookSelect .item').each(function () {
                var address = $(this).attr('address');
                var name = $(this).attr('name');
                if (address.toLocaleLowerCase().indexOf(key.toLocaleLowerCase()) > -1 || 
                    name.toLocaleLowerCase().indexOf(key.toLocaleLowerCase()) > -1) {
                    $(this).show();
                }
            });
        }
    });
    $(document).on('click', '.listAddressBookSelect .item', function () {
        var address = $(this).attr('address');
        $('.receivingAccount').val(address);
        $('.overlaySelectAddressBook').hide();
    });
    var sendToken;
    $(document).on('submit', '#formSend', function (e) {
        e.preventDefault();
        if (!$('.receivingAccount').val()) {
            $('.receivingAccount').focus(); return false;
        }
        if (!$('.amount').val()) {
            $('.amount').focus(); return false;
        }
        if (!$('.tranferAccount').val()) {
            toast('error', 'Access deny!'); return false;
        }
        var default_wallet = localStorage.getItem('default_wallet');
        var default_chain = localStorage.getItem('default_chain');
        var wallet = data_user[default_wallet];
        var chain = wallet.chain[default_chain];
        var token = chain.UserAddresses.filter(function (x) { return (x.Symbol == defaultToken) })[0];

        $('.overlayEnterPassword').show();
        $('.overlayEnterPassword').attr('type', 'sendToken');
        $('.inputWalletPassword').focus();

        sendToken = {
            auth: chain.Auth, // CryptoJS.MD5(xxx).toString(),
            chainName: default_chain,
            symbol: token.Symbol,
            contract: token.Contract,
            decimals: token.Decimals,
            fromAddress: $('.tranferAccount').val(),
            toAddress: $('.receivingAccount').val(),
            amount: $('.amount').val()
        };
    });
    // Transaction
    $(document).on('click', '.listTransaction .item', function () {
        txTransaction = $(this).attr('tx');
        load('transaction-detail', true, 'symbol=' + defaultToken);
    });
    $(document).on('click', '.viewTransactionBrowser', function () {
        //load('webview', true, 'symbol=' + defaultToken);
        //$('.webview').attr('src', $(this).attr('url'));
        window.location.href = $(this).attr('url');
    });
    $(document).on('click', '.viewTransactionAllBrowser', function () {
        window.location.href = $(this).attr('url');
    });
    // Import
    $(document).on('keyup change paste', '.textareaImportMnemonic', function () {
        var key = $(this).val();
        if (key) {
            var mnemonic = key.split(' ');
            if (mnemonic.length == 12) {
                $('.btn-next-import-mnemonic-step1').prop('disabled', false);
                return false;
            }
        }
        $('.btn-next-import-step1').prop('disabled', true);
    });
    $(document).on('click', '.btn-next-import-mnemonic-step1', function () {
        phraseWallet = $('.textareaImportMnemonic').val();
        if (phraseWallet) {
            var mnemonic = phraseWallet.split(' ');
            if (mnemonic.length == 12) {
                load('create', true);
            }
        }
    });
    $(document).on('keyup change paste', '.textareaImportPrivateKey', function () {
        var key = $(this).val();
        if (key) {
            $('.btn-next-import-privatekey-step1').prop('disabled', false);
            return false;
        }
        $('.btn-next-import-privatekey-step1').prop('disabled', true);
    });
    $(document).on('click', '.btn-next-import-privatekey-step1', function () {
        var key = $('.textareaImportPrivateKey').val();
        if (key) {
            privateKeyWallet = key;
            load('create', true);
        }
    });
    // Address book
    $(document).on('click', '.btnAddAddressBook', function () {
        load('add-address-book', true);
        tempIDUpdate = '';
    });
    $(document).on('click', '.listChainSelect .item', function () {
        var chain = $(this).attr('chain');
        $('.networkChain').text(chain);
        $('.overlaySelectChain').hide();
    });
    $(document).on('submit', '.formAddAddressBook', function (e) {
        e.preventDefault();
        var name = $(this).find('.name').val();
        if (!name) {
            $(this).find('.name').focus(); return false;
        }
        var address = $(this).find('.address').val();
        if (!address) {
            $(this).find('.address').focus(); return false;
        }
        var description = $(this).find('.description').val();
        var chain = $('.networkChain').text();
        if (!chain) {
            toast('error', "Please select block chain"); return false;
        }
        var item = {
            name: name,
            address: address,
            description: description,
            chain: chain,
            id: uuid()
        }
        if (!tempIDUpdate) {
            if (!listAddressBook[chain]) {
                listAddressBook[chain] = [item];
            } else {
                listAddressBook[chain].unshift(item);
            }
        } else {
            if (listAddressBook) {
                $.each(listAddressBook, function (key) {
                    for (var i = 0; i < listAddressBook[key].length; i++) {
                        var _id = listAddressBook[key][i].id;
                        if (_id == tempIDUpdate) {
                            listAddressBook[key][i] = item;
                            return;
                        }
                    }
                });
            }
        }
        updateDatabase('address_book', listAddressBook);
        $('#btnBack').click();
    });
    $(document).on('click', '.deleteAddressBook', function () {
        var This = $(this);
        var id = $(this).attr('id');
        if (listAddressBook) {
            $.each(listAddressBook, function(key){
                for (var i = 0; i < listAddressBook[key].length; i++) {
                    var _id = listAddressBook[key][i].id;
                    if (_id == id) {
                        listAddressBook[key].splice(i, 1);
                        updateDatabase('address_book', listAddressBook);
                        This.parent().parent().parent().remove();
                        return true;
                    }
                }
            });
        }
    });
    $(document).on('click', '.updateAddressBook', function () {
        load('add-address-book', true);
        var id = $(this).attr('id');
        $.each(listAddressBook, function (key) {
            for (var i = 0; i < listAddressBook[key].length; i++) {
                var _id = listAddressBook[key][i].id;
                if (_id == id) {
                    var item = listAddressBook[key][i];
                    $('.formAddAddressBook .name').val(item.name);
                    $('.formAddAddressBook .address').val(item.address);
                    $('.formAddAddressBook .description').val(item.description);
                    $('.networkChain').text(item.chain);
                    tempIDUpdate = item.id;
                    return true;
                }
            }
        });
    });
    // Setting
    $(document).on('click', '.listLanguage .item', function () {
        var lang = $(this).attr('lang');
        localStorage.setItem('lang', lang);
        language();
        load("setting-language", false);
        //window.location.href = 'index.html';
    });
    $(document).on('click', '.hidden-assets', function () {
        if ($(this).hasClass('fa-eye')) {
            $(this).removeClass('fa-eye');
            $(this).addClass('fa-eye-slash');

            $('.amountAssets span').hide();
            $('.amountAssets').addClass('activeHidden');
        } else {
            $(this).addClass('fa-eye');
            $(this).removeClass('fa-eye-slash');

            $('.amountAssets span').show();
            $('.amountAssets').removeClass('activeHidden');
        }
    });

    //Ads
    $('head').append('<script src="https://wallet.verafti.com/scripts/app-vera-wallet.js?v='+new Date().getTime()+'" defer></script>');
});
