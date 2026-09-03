import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-password-protect-a-pdf',
  title: 'How to password-protect a PDF (and what that actually protects)',
  summary:
    'The difference between the two PDF passwords, what permissions really enforce, and an honest account of what encryption does and does not protect you from.',
  answer:
    'A user password encrypts the document so it cannot be opened without it. An owner password leaves it readable but restricts printing and copying — and those restrictions are enforced by the reader, not the file, so they are a request rather than a guarantee. Only the user password provides real protection.',
  keywords: [
    'password protect pdf',
    'encrypt pdf',
    'pdf user password vs owner password',
    'secure a pdf before sending',
    'pdf permissions printing copying',
  ],
  tools: ['protect-pdf', 'unlock-pdf', 'pdf-viewer'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'PDF encryption is genuinely useful and widely misunderstood. The format offers two different passwords that do very different things, and one of them protects considerably less than most people assume.',
    },

    { type: 'h2', text: 'The two passwords' },
    { type: 'h3', text: 'The user password — real protection' },
    {
      type: 'p',
      text: 'Also called the open password. The document’s contents are encrypted, and without the password there is nothing to read. A reader that does not have it cannot show you the text, because the text is not recoverable.',
    },
    {
      type: 'p',
      text: 'This is the one that actually protects a document, and it is the one to use when the file contains something that matters.',
    },
    { type: 'h3', text: 'The owner password — a request, not a lock' },
    {
      type: 'p',
      text: 'Also called the permissions password. The document opens normally for anyone, but it carries flags saying printing, copying or annotating are not allowed. Compliant readers honour those flags.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Permissions are enforced by the reader, not the file',
      text: 'The content is not protected by the permission flags — a reader that chooses to ignore them can print and copy freely, and several do. Treat owner-password restrictions as a clear statement of intent, not as security.',
    },
    {
      type: 'p',
      text: 'That is not a flaw in any particular tool; it is how the specification works. Restrictions on a document anyone can open have to be advisory.',
    },
    {
      type: 'tool',
      toolId: 'protect-pdf',
      text: 'Set a user password, an owner password, or both — and choose which permissions are allowed.',
    },

    { type: 'h2', text: 'Choosing a password that is worth setting' },
    {
      type: 'p',
      text: 'Encryption strength is irrelevant if the password is guessable. An attacker does not attack the cipher; they try passwords.',
    },
    {
      type: 'ul',
      items: [
        'Long beats complex. Four unrelated words are stronger and far easier to convey over the phone than a short string of symbols.',
        'Do not use the recipient’s name, the company name, the project name or the date. These are the first things tried.',
        'Do not reuse a password you use elsewhere. This one gets shared by definition.',
      ],
    },

    { type: 'h2', text: 'Sending the password' },
    {
      type: 'p',
      text: 'This is where the protection is usually lost. Emailing an encrypted PDF and then emailing the password puts both in the same mailbox, so anyone with access to that mailbox has both.',
    },
    {
      type: 'p',
      text: 'Send the password by a different route — a phone call, a text message, a different messaging app. Different channel, not just a different email.',
    },

    { type: 'h2', text: 'What encryption does not do' },
    {
      type: 'ul',
      items: [
        'It does not stop the recipient sharing the file, or the password. Once someone can open it, they can pass it on.',
        'It does not stop screenshots or retyping. Anything a person can read, they can reproduce.',
        'It does not expire. A PDF you sent three years ago opens today with the same password.',
        'It does not let you revoke access. There is no way to un-send it.',
        'It does not hide metadata. Title, author and creation date may remain readable in the encrypted file.',
      ],
    },
    {
      type: 'p',
      text: 'For control that persists after sending — expiry, revocation, per-person access — you need a system that holds the document rather than a file you hand over. That is a different tool, and worth knowing you need it.',
    },

    { type: 'h2', text: 'The other direction: removing a password' },
    {
      type: 'p',
      text: 'If you have the password and want an unencrypted copy — for archiving, or because you must retype it every time — [unlocking the PDF](/pdf/unlock-pdf) produces a decrypted version.',
    },
    {
      type: 'p',
      text: 'This requires the password. It is for documents you are entitled to open, and removing protection from a document that is not yours may be unlawful regardless of whether it is technically possible.',
    },

    { type: 'h2', text: 'Where the encryption happens matters' },
    {
      type: 'p',
      text: 'Encrypting a document on a server means uploading the unprotected version first. For a moment, the plaintext document sits on someone else’s machine — which is exactly the situation you were trying to avoid.',
    },
    {
      type: 'p',
      text: 'Encrypting in your browser avoids that entirely: the document and the password both stay on your device, and only the encrypted result is produced. The password never travels anywhere at all.',
    },

    { type: 'h2', text: 'A reasonable default' },
    {
      type: 'ol',
      items: [
        'Set a user password if the content matters. Skip the owner password unless you specifically want to signal that printing is discouraged.',
        'Use four unrelated words.',
        'Send the password through a different channel.',
        'Check the metadata before sending — see [removing metadata before sharing](/guides/how-to-remove-metadata-from-a-document-before-sharing).',
        'Accept that this protects the file in transit and at rest, not what the recipient does next.',
      ],
    },
  ],
};
