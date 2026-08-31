export function RulesContent() {
  return (
    <article className="space-y-8 text-pretty text-sm leading-relaxed text-cream/75">
      <p>
        This is an unofficial fan table for Wolfgang Warsch&apos;s{" "}
        <span className="text-cream">That&apos;s Pretty Clever</span> (Ganz schön clever). It is
        not affiliated with Schmidt Spiele, CMYK, or the Steam edition. The play below follows the
        published rules; a few digital notes sit at the end.
      </p>

      <Section title="Goal">
        <p>
          Score as many points as you can across five colored areas on your own sheet. After every
          player has been the active roller for the last round, the highest total wins.
        </p>
      </Section>

      <Section title="Setup">
        <p>
          One to four players. Each person has their own sheet. Six dice sit in the middle: yellow,
          blue, green, orange, purple, and a white joker. The host starts as the first active
          player.
        </p>
        <p>
          The game lasts <strong className="text-cream">6 rounds</strong> with 1–2 players,{" "}
          <strong className="text-cream">5 rounds</strong> with 3, and{" "}
          <strong className="text-cream">4 rounds</strong> with 4. A round ends when everyone has
          been the active player once.
        </p>
      </Section>

      <Section title="Round bonuses">
        <p>At the start of the first four rounds, everyone claims the printed bonus:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Round 1 — bank a reroll.</li>
          <li>Round 2 — bank an extra die.</li>
          <li>Round 3 — bank a reroll.</li>
          <li>
            Round 4 — choose one: a free ✕ in yellow, blue, or green, or write a 6 in orange or
            purple.
          </li>
        </ul>
      </Section>

      <Section title="The active player">
        <p>
          You get up to three rolls. After each roll, pick one die and score it on your sheet at
          the value showing. Then every remaining die that shows a{" "}
          <strong className="text-cream">lower</strong> value goes to the silver platter and is
          gone for the rest of your turn. If you pick the lowest die, nothing drops.
        </p>
        <p>
          Roll again with whatever is still in hand. After the third pick — or if nothing is left
          to roll — every leftover die joins the platter.
        </p>
        <p>
          You must score a legal die if one exists. If nothing on the roll can be written, forfeit
          that roll: it counts as one of your three, lower dice do not go to the platter, and you
          keep the remaining dice for the next roll (unless it was already the third).
        </p>
        <p>
          Spending high dice too early can empty your hand before the third roll. That is allowed
          — and usually a mistake.
        </p>
      </Section>

      <Section title="The white die">
        <p>
          White is a color joker. Score it as yellow, green, orange, or purple, or pair it with
          blue (see below).
        </p>
      </Section>

      <Section title="The blue die">
        <p>
          Blue always scores <strong className="text-cream">white + blue</strong>, no matter where
          those two dice currently sit — in the roll, already kept, or on the platter. You never
          write just one of them. Active and passive players both use the live sum.
        </p>
        <p>
          If you pick blue on one roll and white later (or the other way around), you can fill two
          blue boxes in the same turn.
        </p>
      </Section>

      <Section title="Yellow">
        <p>
          Cross the rolled number. Each of 1–6 appears twice; you may mark only one copy per die.
          Order does not matter. The anti-diagonal starts pre-crossed.
        </p>
        <p>
          Completing a column scores 10 / 14 / 16 / 20. Completing a row or the main diagonal
          awards the bonus printed there.
        </p>
      </Section>

      <Section title="Blue">
        <p>
          Cross the sum 2–12 anywhere it is still open. Score by how many boxes you filled: 0, 1,
          2, 4, 7, 11, 16, 22, 29, 37, 46, 56. Rows and some columns award bonuses when completed.
        </p>
      </Section>

      <Section title="Green">
        <p>
          Fill left to right with no gaps. The die must be at least as high as the printed
          threshold (1–5, then 1–6). Score is the triangle number above the last marked box, up to
          66.
        </p>
      </Section>

      <Section title="Orange">
        <p>
          Write the pips left to right, any value. ×2 and ×3 boxes multiply immediately (a 6 on ×2
          becomes 12). Add every number you wrote.
        </p>
      </Section>

      <Section title="Purple">
        <p>
          Write left to right. The first box is free; each later box must be{" "}
          <strong className="text-cream">strictly higher</strong> than the one to its left — except
          after a 6, when any value is legal again. Add the numbers.
        </p>
      </Section>

      <Section title="Passive players">
        <p>
          After the active player is done scoring their rolls (and any extra dice they spend
          first), everyone else scores <strong className="text-cream">one</strong> die from the
          silver platter. The die stays there — several people can pick the same one.
        </p>
        <p>
          If nothing on the platter is legal for you, you must take one of the dice the active
          player kept. If neither pile has a legal die, you pass.
        </p>
        <p>
          Then the next seat becomes active, takes all six dice, and starts a fresh turn. When
          everyone has been active, the round ends.
        </p>
      </Section>

      <Section title="Rerolls">
        <p>
          Banked rerolls may be spent only by the active player, after a roll they dislike. Reroll
          every die still in hand — never the platter, and never a subset.
        </p>
      </Section>

      <Section title="Extra dice">
        <p>
          Spend extra-die tokens at the <strong className="text-cream">end</strong> of your turn —
          after the active player&apos;s three picks, or after a passive pick. Choose any of the
          six dice at its current value, even one already used this turn by someone else.
        </p>
        <p>
          You may spend several extras in one turn, but the same die (same color) only once for
          you that turn. Extra dice cannot be rerolled.
        </p>
        <p>
          After the last round, leftover extra-die tokens may still be spent. Unused rerolls
          expire.
        </p>
      </Section>

      <Section title="Bonuses">
        <p>
          Filling a box with a printed bonus — or completing a yellow/blue row, column, or the
          yellow diagonal — awards that bonus immediately. You cannot save an ✕ or a “write this
          number” bonus. They chain: if a bonus fills another bonus box, resolve the next one
          right away.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Colored ✕ — mark any open yellow or blue box, or the next green box.</li>
          <li>Orange or purple number — write that value in the next open box of that color.</li>
          <li>+die and ↻ — bank a token on the action bars; spend them later.</li>
          <li>Fox — circle a fox. It scores at the end, not now.</li>
        </ul>
      </Section>

      <Section title="Foxes and winning">
        <p>
          Each fox is worth your <strong className="text-cream">lowest</strong> of the five color
          scores. If any color is still 0, every fox is worth 0.
        </p>
        <p>
          Highest total wins. Ties go to the player with the single highest color area. If that
          still ties, they share the win.
        </p>
        <p>Solo play rates your total against the printed cleverness table (try harder … you&apos;re so clever).</p>
      </Section>

      <Section title="On this table">
        <p>
          Passive picks happen one seat at a time instead of all at once, so you can see the same
          platter. Solo: after you finish extras on your active turn, the table rolls a fresh six
          and parks the three lowest on the platter (ties break in a fixed color order) for your
          passive pick.
        </p>
        <p>
          Rooms live in this browser session&apos;s server memory. Rejoin the same code with the
          same name if you drop mid-game. A host restart clears open tables.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl text-cream">{title}</h2>
      {children}
    </section>
  );
}
