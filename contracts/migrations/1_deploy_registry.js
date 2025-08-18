const KeyRegistry = artifacts.require("KeyRegistry");

module.exports = async function (deployer) {
  await deployer.deploy(KeyRegistry);
};
