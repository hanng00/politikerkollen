"""Text chunking strategies for embedding.

Provides pluggable strategies for splitting documents into chunks suitable
for embedding. Different strategies work better for different document types.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from cognition.core.models import CHARS_PER_TOKEN, MAX_TOKENS, Chunk


class ChunkingStrategy(ABC):
    """Abstract base class for text chunking strategies."""

    @abstractmethod
    def chunk(self, text: str) -> list[Chunk]:
        """Split text into chunks.

        Args:
            text: The text to chunk

        Returns:
            List of Chunk objects with index, text, and character positions
        """
        ...


class NoChunking(ChunkingStrategy):
    """No chunking - return text as single chunk, truncating if needed.

    Use for short texts like promises that fit within token limits.
    """

    def __init__(self, max_tokens: int = MAX_TOKENS):
        self.max_tokens = max_tokens
        self.max_chars = max_tokens * CHARS_PER_TOKEN

    def chunk(self, text: str) -> list[Chunk]:
        if not text:
            return []

        truncated = text[: self.max_chars] if len(text) > self.max_chars else text
        return [
            Chunk(
                index=0,
                text=truncated,
                start_char=0,
                end_char=len(truncated),
            )
        ]


class ParagraphChunking(ChunkingStrategy):
    """Split on paragraph boundaries, merging small paragraphs.

    Respects natural document structure while keeping chunks within token limits.
    Small paragraphs are merged together; large paragraphs are split.
    """

    def __init__(
        self,
        target_tokens: int = 1024,
        max_tokens: int = 2048,
        overlap_tokens: int = 128,
    ):
        self.target_tokens = target_tokens
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        self.target_chars = target_tokens * CHARS_PER_TOKEN
        self.max_chars = max_tokens * CHARS_PER_TOKEN
        self.overlap_chars = overlap_tokens * CHARS_PER_TOKEN

    def chunk(self, text: str) -> list[Chunk]:
        if not text:
            return []

        paragraphs = self._split_paragraphs(text)
        if not paragraphs:
            return []

        chunks: list[Chunk] = []
        current_texts: list[str] = []
        current_start = 0
        current_len = 0

        for para_text, para_start, para_end in paragraphs:
            para_len = len(para_text)

            if para_len > self.max_chars:
                if current_texts:
                    chunks.append(self._make_chunk(len(chunks), current_texts, current_start))
                    current_texts = []
                    current_len = 0

                sub_chunks = self._split_large_paragraph(para_text, para_start, len(chunks))
                chunks.extend(sub_chunks)
                current_start = para_end
            elif current_len + para_len > self.target_chars:
                if current_texts:
                    chunks.append(self._make_chunk(len(chunks), current_texts, current_start))

                if self.overlap_chars > 0 and current_texts:
                    overlap_text = current_texts[-1][-self.overlap_chars :]
                    current_texts = [overlap_text, para_text]
                    current_start = para_start - len(overlap_text)
                    current_len = len(overlap_text) + para_len
                else:
                    current_texts = [para_text]
                    current_start = para_start
                    current_len = para_len
            else:
                if not current_texts:
                    current_start = para_start
                current_texts.append(para_text)
                current_len += para_len

        if current_texts:
            chunks.append(self._make_chunk(len(chunks), current_texts, current_start))

        return chunks

    def _split_paragraphs(self, text: str) -> list[tuple[str, int, int]]:
        """Split text into paragraphs with their positions."""
        paragraphs = []
        current_pos = 0

        for part in text.split("\n\n"):
            stripped = part.strip()
            if stripped:
                start = text.find(part, current_pos)
                end = start + len(part)
                paragraphs.append((stripped, start, end))
                current_pos = end

        return paragraphs

    def _split_large_paragraph(
        self, text: str, start_pos: int, chunk_start_index: int
    ) -> list[Chunk]:
        """Split a paragraph that exceeds max_chars into smaller chunks."""
        chunks = []
        pos = 0
        idx = chunk_start_index

        while pos < len(text):
            end = min(pos + self.max_chars, len(text))

            if end < len(text):
                space_pos = text.rfind(" ", pos, end)
                if space_pos > pos:
                    end = space_pos

            chunk_text = text[pos:end].strip()
            if chunk_text:
                chunks.append(
                    Chunk(
                        index=idx,
                        text=chunk_text,
                        start_char=start_pos + pos,
                        end_char=start_pos + end,
                    )
                )
                idx += 1

            if self.overlap_chars > 0 and end < len(text):
                pos = end - self.overlap_chars
            else:
                pos = end

        return chunks

    def _make_chunk(self, index: int, texts: list[str], start_char: int) -> Chunk:
        """Create a chunk from accumulated paragraph texts."""
        combined = "\n\n".join(texts)
        return Chunk(
            index=index,
            text=combined,
            start_char=start_char,
            end_char=start_char + len(combined),
        )


class SlidingWindowChunking(ChunkingStrategy):
    """Fixed-size chunks with overlap using a sliding window.

    Simple and predictable, but may split mid-sentence.
    Use when paragraph structure is unreliable.
    """

    def __init__(
        self,
        chunk_tokens: int = 1024,
        overlap_tokens: int = 128,
    ):
        self.chunk_tokens = chunk_tokens
        self.overlap_tokens = overlap_tokens
        self.chunk_chars = chunk_tokens * CHARS_PER_TOKEN
        self.overlap_chars = overlap_tokens * CHARS_PER_TOKEN

    def chunk(self, text: str) -> list[Chunk]:
        if not text:
            return []

        if len(text) <= self.chunk_chars:
            return [Chunk(index=0, text=text, start_char=0, end_char=len(text))]

        chunks = []
        pos = 0
        idx = 0

        while pos < len(text):
            end = min(pos + self.chunk_chars, len(text))

            if end < len(text):
                space_pos = text.rfind(" ", pos, end)
                if space_pos > pos + self.chunk_chars // 2:
                    end = space_pos

            chunk_text = text[pos:end].strip()
            if chunk_text:
                chunks.append(
                    Chunk(
                        index=idx,
                        text=chunk_text,
                        start_char=pos,
                        end_char=end,
                    )
                )
                idx += 1

            step = self.chunk_chars - self.overlap_chars
            pos += max(step, 1)

        return chunks
