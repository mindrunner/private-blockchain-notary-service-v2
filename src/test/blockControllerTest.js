const supertest = require("supertest");
const bitcoin = require("bitcoinjs-lib");
const bitcoinMessage = require("bitcoinjs-message");
const Blockchain = require('../blockchain').Blockchain;
const express = require("express");


const testAddress = "16r7Wz413PvSAQmrsopvs2gJwPbcddc9Sm";
const keyPair = bitcoin.ECPair.fromWIF('KwvZLcJAomJtui1VaNpbeJ8DY2MJoCcu6SJivw3NZFFkLWW473ka');
const privateKey = keyPair.privateKey;
let signature = null;
let starhash = null;

describe("BlockController", function () {
    describe("Add Block", function () {
        let blockchainController;
        before(function () {
            blockchainController = require("../../BlockchainController.js")(express(), new Blockchain());
        });

        it("creates a validation request", function (done) {
            supertest(blockchainController.app)
                .post("/requestValidation")
                .send({name: 'john'})
                .expect((res) => {
                    if (!('validationWindow' in res.body)) throw new Error("missing next key");
                    if (!(res.body.validationWindow === 300)) throw new Error("wrong validation window");
                    signature = bitcoinMessage.sign(res.body.message, privateKey, keyPair.compressed)
                })
                .end(done)
        });

        it("validate request", function (done) {
            supertest(blockchainController.app)
                .post("/message-signature/validate")
                .send({address: testAddress, signature: signature})
                .expect((res) => {
                    if (!('registerStar' in res.body)) throw new Error("missing next key");
                    if (!(res.body.status.validationWindow <= 300)) throw new Error("wrong validation window");
                })
                .end(done)
        });

        it("creates a star", function (done) {
            let star = {
                "address": testAddress,
                "star": {
                    "dec": "68° 52' 56.9",
                    "ra": "16h 29m 1.0s",
                    "story": "Found star using https://www.google.com/sky/"
                }
            };

            supertest(blockchainController.app)
                .post("/block")
                .send(star)
                .expect((res) => {
                    if (!('storyDecoded' in res.body.body.star)) throw new Error("missing decoded story");
                    starhash = res.body.hash;
                })
                .end(done)
        });

        it("try to create another star", function (done) {
            let star = {
                "address": testAddress,
                "star": {
                    "dec": "67° 52' 56.9",
                    "ra": "14h 29m 1.0s",
                    "story": "This star does not exist and should never do!"
                }
            };

            supertest(blockchainController.app)
                .post("/block")
                .send(star)
                .expect((res) => {
                    if (res.clientError !== true) throw new Error("Creating more than one star is not allowed!");
                })
                .end(done)
        });


        it("get star by hash", function (done) {
            supertest(blockchainController.app)
                .get("/stars/hash:" + starhash)
                .expect((res) => {
                    if (!('storyDecoded' in res.body.body.star)) throw new Error("missing decoded story");
                })
                .end(done)
        });

        it("get stars by address", function (done) {
            supertest(blockchainController.app)
                .get("/stars/address:" + testAddress)
                .expect((res) => {
                    if (res.body.length <= 0) throw new Error("could not find stars");
                })
                .end(done)
        });
    })
});
