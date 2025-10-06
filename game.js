// DOM handles
const outBox = document.getElementById("out");
const inputBox = document.getElementById("answer");
const submitBtn = document.getElementById("submit-btn");
const scoreEl = document.getElementById("score");
const roundEl = document.getElementById("round");

// println(...) -> appends text to #out with a trailing newline
function println(...args) {
  outBox.textContent += args.join(" ") + "\n";
  // keep the latest text visible
  outBox.scrollTop = outBox.scrollHeight;
}

// ask(prompt) -> prints prompt, focuses input, returns a Promise that
// resolves with the text the user entered when they click Submit (or press Enter)
function ask(promptText) {
  if (promptText && promptText.length) println(promptText);
  inputBox.value = "";
  inputBox.focus();

  return new Promise((resolve) => {
    const onClick = () => {
      cleanup();
      resolve(inputBox.value.trim());
    };
    const onKey = (ev) => {
      if (ev.key === "Enter") {
        cleanup();
        resolve(inputBox.value.trim());
      }
    };
    function cleanup() {
      submitBtn.removeEventListener("click", onClick);
      inputBox.removeEventListener("keydown", onKey);
    }
    submitBtn.addEventListener("click", onClick, { once: true });
    inputBox.addEventListener("keydown", onKey, { once: true });
  });
}

/******************************************************************
 * GAME DATA  (same lists you used)
 ******************************************************************/
const baseWordLists = [
  ["rip","sun","zip","box","hat","bat","pen","man","key","mud"],
  ["mint","snow","milk","bark","gold","nest","drip","clay","frog","tent"],
  ["plant","grape","stone","bread","chair","flame","train","shelf","cloud","crane"],
];

const baseBonusList = [
  ["planet","silver","singer","forest","branch","danger","friend","stream","artist","circle"],
  ["husband","morning","blanket","cabinet","teacher","picture","fortune","airport","kingdom","journey"],
];

/******************************************************************
 * Utility: pick+scramble a word from a list without repeating
 ******************************************************************/
function pickAndScramble(listNumber, lists) {
  const arr = lists[listNumber];
  const idx = Math.floor(Math.random() * arr.length);
  const word = arr.splice(idx, 1)[0];

  const chars = [...word];
  let scrambled = word;
  while (scrambled === word && chars.length > 1) {
    chars.sort(() => Math.random() - 0.5);
    scrambled = chars.join("");
  }

  return { scrambled, word };
}

/******************************************************************
 * Scoring helper
 ******************************************************************/
function award(score, seconds) {
  if (seconds < 3) {
    println("Quick answer! Bonus point awarded.");
    return score + 2;
  } else if (seconds < 7) {
    println("Correct in good time!");
    return score + 1;
  } else {
    println("Correct, but try to be quicker.");
    return score + 0.5;
  }
}

/******************************************************************
 * Main game flow
 ******************************************************************/
async function main() {
  // Clone word lists so they reset each round
  const wordLists = baseWordLists.map(list => [...list]);
  const bonusList = baseBonusList.map(list => [...list]);

  // State
  let listNumber = 0;
  let score = 0;
  let attempts = 0;
  let wordsMain = 0;
  updateStats();

  function updateStats() {
    scoreEl.textContent = String(score);
    roundEl.textContent = String(wordsMain);
  }

  println(
    "Welcome to the word scramble guessing game! You will have five attempts to",
    "correctly unscramble one three letter word, one four letter word, and one",
    "five letter word. If you complete this task, you will have the option to",
    "participate in a bonus game to improve your score. Good luck!\n"
  );

  while (true) {
    const ready = (await ask("Type 'ready' to continue:")).toLowerCase();
    println("");
    if (ready === "ready") break;
  }

  // MAIN LOOP
  while (attempts < 5) {
    attempts += 1;
    wordsMain += 1;
    updateStats();

    const { scrambled, word } = pickAndScramble(listNumber, wordLists);
    println("Unscramble the word:", scrambled);

    const t0 = performance.now();
    const guess = (await ask("Your guess:")).toLowerCase();
    const t1 = performance.now();
    const elapsed = (t1 - t0) / 1000;

    if (guess === word.toLowerCase()) {
      score = award(score, elapsed);
      listNumber = Math.min(3, listNumber + 1);
    } else {
      println("Incorrect, the correct word is:", word);
      if (listNumber >= 1) listNumber -= 1;
    }

    println("");
    updateStats();

    if (listNumber === 3) break;
  }

  // BONUS GAME
  let bonusGameChoice = "two";
  if (listNumber === 3) {
    println(
      "Congratulations, you win! Enter 'one' if you would like to play a bonus game.",
      "Enter 'two' if you would not like to participate."
    );
    bonusGameChoice = (await ask("")).toLowerCase();
    println("");

    while (bonusGameChoice !== "one" && bonusGameChoice !== "two") {
      println(
        "Invalid input. Enter 'one' if you would like to play a bonus game.",
        "Enter 'two' if you would not like to participate."
      );
      bonusGameChoice = (await ask("")).toLowerCase();
      println("");
    }
  } else {
    println("You lose, play again.");
  }

  if (bonusGameChoice === "two") {
    println("Your score was:", String(score), "/", String(2 * wordsMain), "possible points.");
  } else {
    listNumber = 0;
    while (true) {
      const { scrambled, word } = pickAndScramble(listNumber, bonusList);
      println("Unscramble the word:", scrambled);

      const t0 = performance.now();
      const guess = (await ask("Your guess:")).toLowerCase();
      const t1 = performance.now();
      const elapsed = (t1 - t0) / 1000;

      if (guess === word.toLowerCase()) {
        score = award(score, elapsed);
        listNumber += 1;
      } else {
        println("Incorrect, the correct word is:", word, "");
        break;
      }

      println("");
      if (listNumber === 2) break;
    }
    println("");
    println("Outstanding! Your score was:", String(score), "/", String(2 * wordsMain), "possible points.");
  }
}

/******************************************************************
 * LOOP THE GAME UNTIL PLAYER SAYS NO
 ******************************************************************/
async function gameLoop() {
  let playAgain = true;

  while (playAgain) {
    outBox.textContent = ""; // clear screen
    await main();
    println("");
    const again = (await ask("Would you like to play again? (yes/no):")).toLowerCase();
    if (again !== "yes") {
      println("");
      println("Thanks for playing!");
      playAgain = false;
    }
  }
}

// Kick it off
gameLoop().catch(err => {
  println("\n[Error]", err?.message ?? String(err));
  console.error(err);
});