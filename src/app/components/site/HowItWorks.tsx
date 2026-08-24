import Image from "next/image";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    n: "01",
    title: "Fund",
    img: "/img/step-fund.jpg",
    alt: "A young plant growing from a pile of coins",
    text: "A policy creator locks the payout reserve in the STRK20 privacy pool.",
  },
  {
    n: "02",
    title: "Verify",
    img: "/img/step-verify.jpg",
    alt: "A person signing a document",
    text: "An authorized signer submits the event record. Replay is blocked on-chain.",
  },
  {
    n: "03",
    title: "Authorize",
    img: "/img/step-authorize.jpg",
    alt: "Two people shaking hands",
    text: "With a valid event accepted, the contract authorizes the eligible claimant.",
  },
  {
    n: "04",
    title: "Settle",
    img: "/img/step-settle.jpg",
    alt: "Smiling children in a community",
    text: "The payout settles privately into an open note, so the claimant stays protected.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 className={styles.h2}>From funded policy to a private payout</h2>
          <p className={styles.intro}>
            Four steps take a claim from a funded reserve to a settled payout, with every
            state proven on Starknet.
          </p>
        </div>

        <div className={styles.grid}>
          {STEPS.map((s) => (
            <article key={s.n} className={styles.card}>
              <div className={styles.media}>
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 25vw"
                  className={styles.img}
                />
                <span className={styles.tint} aria-hidden />
                <span className={styles.step}>{s.n}</span>
              </div>
              <div className={styles.body}>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardText}>{s.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
