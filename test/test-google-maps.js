var fs = require("fs");
var assert = require("assert");
var app = require("../lib/google-maps");


function fresh_api() {
    var api = app.api;
    api.reset();
    reset_im(api.im);
    return api;
}

function reset_im(im) {
    im.user = null;
    im.i18n = null;
    im.i18n_lang = null;
    im.current_state = null;
}

function maybe_call(f, that, args) {
    if (typeof f != "undefined" && f !== null) {
        f.apply(that, args);
    }
}

function check_state(user, content, next_state, expected_response, setup,
                     teardown) {
    // setup api
    var api = fresh_api();
    var from_addr = "1234567";
    var user_key = "users." + from_addr;
    api.kv_store[user_key] = user;

    maybe_call(setup, this, [api]);

    api.add_reply({
        cmd: "outbound.reply_to"
    });

    // send message
    api.on_inbound_message({
        cmd: "inbound-message",
        msg: {
            from_addr: from_addr,
            content: content,
            message_id: "123"
        }
    });

    // check result
    var saved_user = api.kv_store[user_key];
    assert.equal(saved_user.current_state, next_state);
    var reply = api.request_calls.shift();
    var response = reply.content;
    try {
        assert.ok(response);
        assert.ok(response.match(expected_response));
        assert.ok(response.length <= 163);
    } catch (e) {
        console.log(api.logs);
        console.log(response);
        console.log(expected_response);
        if (typeof response != 'undefined')
            console.log("Content length: " + response.length);
        throw e;
    }
    assert.deepEqual(app.api.request_calls, []);
    assert.equal(app.api.done_calls, 1);

    maybe_call(teardown, this, [api, saved_user]);
}

describe("test_api", function() {
    it("should exist", function() {
        assert.ok(app.api);
    });
    it("should have an on_inbound_message method", function() {
        assert.ok(app.api.on_inbound_message);
    });
    it("should have an on_inbound_event method", function() {
        assert.ok(app.api.on_inbound_event);
    });
});

describe("test_google_maps", function() {
    it("new users should be asked where they are", function () {
        check_state(null, null, "start_address",
            "^Where are you now?");
    });

    it('should go to end when asked for them name', function() {
        check_state({current_state: 'start_address'}, '9 Friend street',
            'end', '^Thank you and bye bye!');
    });
});