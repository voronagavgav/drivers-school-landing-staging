"use client";

import { Accordion } from "radix-ui";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";

import styles from "@/app/landing.module.css";

type FaqAccordionProps = {
  items: ReadonlyArray<readonly [question: string, answer: string]>;
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue="faq-1"
      className={styles.faqList}
    >
      {items.map(([question, answer], index) => (
        <Accordion.Item key={question} value={`faq-${index}`} className={styles.faqItem}>
          <Accordion.Header className={styles.faqHeader}>
            <Accordion.Trigger className={styles.faqTrigger}>
              {question}
              <CaretDownIcon size={20} aria-hidden="true" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className={styles.faqContent}>
            <p>{answer}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
