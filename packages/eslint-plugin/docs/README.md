# Writing Rule Documentation

Before you read ahead, know that you don't need to know all of this off the top of your head.
If you run the `docs:check` script, it will apply some validation to your documentation, and help you figure out what order things should be in, and what sections should be included.

Three quick things:

- Every single rule should have a markdown file in the docs/rules folder named `rule-name.md`.
- Every _not deprecated_ rule should have a row within the ["Supported Rules"](../../README.md#supported-rules) table in the plugin's `README.md`.
- Every rule based off a `tslint` rule should be appropriately marked up within `ROADMAP.md`.

## Documenting a Rule

A rule's documentation should have the following sections - in this order
Note that sections marked with `(required)` are required, and will block your PR if you skip them.

### Title + Long Description (required)

The document title should be a level 1 heading matching the following pattern:
`# {description from rule.meta.docs.description} ({rule name})`
This should be the one and only level one header.

Immediately proceeding the header must be a long-form description of the rule. There's no hard-and-fast rule about how long this description should be, but you should try to avoid writing more than a few lines unless you think the rule needs the backstory. Your PR reviewer should help you out and ask you to shorten it if they think it's too long.

### Options (required)

This section should begin with a level 2 title matching the following pattern:
`## Options`

If your rule has no options, then you should just include the text `None.`.
If your rule has options, you should do two things:

1. Include a TypeScript code block which uses types/interfaces to describe the options accepted by the rule.
   - Everything should have `//` comments briefly describing what each
1. Include a second TypeScript code block which shows the default config for the rule.

### How to Configure (optional)

This section should begin with a level 2 title matching the following pattern:
`## How to Configure`

If your rule is a bit complicated to configure, you should consider adding this section.
If your rule extends a base rule, you must add this section, and in the example you must explicitly show the base rule being disabled.

### Examples (required)

This section should begin with a level 2 title matching the following pattern:
`## Examples`

In this section you should include two TypeScript code blocks; one showing cases your rule will report on, the other showing how to correct those same cases. These examples should be in the form of a TypeScript code block; you can include as many cases within each code block.

If your rule has no options, then you just need a one valid and one invalid block to demonstrate how the rule works.

If your rule has options, you should include one of each block for each option in your rule, demonstrating the effect of each option.
