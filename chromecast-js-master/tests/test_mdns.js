/**
 * Test only mDNS browser
 */

chromecastjs = require('../');

var browser = new chromecastjs.Browser();

browser.on('deviceOn', function(device){
	console.log('\r\nChromecast Found: ', device);
});

setTimeout(function() {
	console.log('\r\n\r\n > All Device Responses', browser.devices);
	//process.exit();
}, 10000);
