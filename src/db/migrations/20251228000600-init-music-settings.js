"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Adjust defaults to your liking. Keeping them sensible for Raspberry Pi.
    // - music.folders: where you plan to store/scan music
    // - music.extensions: lower-case, comma-separated, no dots (or with dots—just be consistent)
    await queryInterface.bulkInsert("Settings", [
      {
        id: "2f3b1a18-4b8c-4b12-9a0b-8d7c6a9d6f01",
        name: "music.folders",
        value: "/mnt/music,/home/pi/Music",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "c0e7e1b2-2e7e-4d8b-9fd1-8ed0b1b2a8a2",
        name: "music.extensions",
        value: "flac,wav,mp3,m4a,aac,ogg",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Settings", {
      name: ["music.folders", "music.extensions"],
    });
  },
};
