"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./SiteNav.module.css";

const LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Proof model", href: "/proof-model" },
  { label: "Security", href: "/security" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Primary">
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" className={styles.brandMark} width={28} height={28} />
          <span>Nyalthe</span>
        </Link>

        <ul className={styles.links}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link className={styles.link} href={l.href}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Link href="/app" className={styles.cta}>
            Open app
          </Link>
          <button
            className={styles.burger}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={open ? styles.barTop : ""} />
            <span className={open ? styles.barMid : ""} />
            <span className={open ? styles.barBot : ""} />
          </button>
        </div>
      </nav>

      {open && (
        <div className={styles.drawer}>
          <ul className={styles.drawerLinks}>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  className={styles.drawerLink}
                  href={l.href}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/app"
            className={styles.drawerCta}
            onClick={() => setOpen(false)}
          >
            Open app
          </Link>
        </div>
      )}
    </header>
  );
}
